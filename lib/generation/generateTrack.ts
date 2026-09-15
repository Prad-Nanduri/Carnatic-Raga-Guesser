import { prisma } from "@/lib/prisma";
import { putObject, createDownloadUrl, trackKey } from "@/lib/storage/r2";
import { RAGA_DATA } from "@/lib/raga-engine/select";

/**
 * Real music generation via the Hugging Face Inference API
 * (facebook/musicgen-small, free tier).
 *
 * Request:
 *   POST https://router.huggingface.co/hf-inference/models/facebook/musicgen-small
 *   Authorization: Bearer ${HF_API_TOKEN}
 *   Content-Type: application/json
 *   Body: { "inputs": "<prompt built from raga + mode + instrument + ...>" }
 *
 * Response:
 *   200 -> audio bytes (musicgen returns a WAV clip, ~10s per call)
 *   503 -> { "error": "Model ... is currently loading", "estimated_time": <secs> }
 *   401 -> invalid token
 *
 * Duration: the hosted inference API exposes no duration parameter; each call
 * returns roughly 10s. Allowed durations are 10s (one call) and 20s (two calls
 * concatenated — see concatWav). Longer clips are intentionally not offered.
 */

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small";
const HF_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2; // initial try + one retry (per chunk)

export const ALLOWED_DURATIONS = [10, 20] as const;
export const SECONDS_PER_CALL = 10;

const INSTRUMENT_TIMBRE: Record<string, string> = {
  // NOTE: "voice" is an experimental approximation — text-to-music models do
  // not do dedicated singing-voice synthesis; this only nudges timbre.
  voice: "a solo Carnatic vocal-style melodic line",
  violin: "solo Carnatic violin with lyrical slides and gamaka bowing",
  veena: "solo Saraswati veena, plucked and resonant",
  venu_flute: "solo Carnatic bamboo venu flute, breathy and mellow",
  nadaswaram: "solo nadaswaram, reedy and majestic double-reed",
  saxophone: "solo saxophone in the Carnatic Kadri Gopalnath style, gamaka-rich",
  sitar_fusion: "solo sitar in a Hindustani-style fusion treatment",
};

/** Build the MusicGen text prompt from the job's musical parameters. */
export function buildPrompt(job: {
  generationMode: "alapana" | "kriti";
  raga: string;
  tala?: string | null;
  lyrics?: string | null;
  mood?: string | null;
  genre?: string | null;
  instrument: string;
  durationSeconds: number;
}): string {
  const theory = RAGA_DATA[job.raga];
  const timbre = INSTRUMENT_TIMBRE[job.instrument] ?? `solo ${job.instrument}`;
  const moodPart =
    job.mood || job.genre
      ? `${[job.mood, job.genre].filter(Boolean).join(" ")} character, `
      : "";

  return [
    `unmetered alapana improvisation in Carnatic raga ${job.raga}`,
    `${timbre} over a quiet continuous tanpura drone`,
    `free rhythm, no percussion, no tala, no meter`,
    theory
      ? `exploring the raga's character — ${theory.phrases.join("; ")}; arohana ${theory.arohana}, avarohana ${theory.avarohana}`
      : `exploring the raga's characteristic phrases`,
    `${moodPart}roughly ${job.durationSeconds} seconds`,
  ].join(", ");
}

async function callHuggingFace(prompt: string): Promise<Buffer> {
  const token = process.env.HF_API_TOKEN || process.env.HF_TOKEN;
  if (!token) throw new Error("HF_API_TOKEN is not configured");

  const res = await fetch(HF_MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(HF_TIMEOUT_MS),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    let detail = text.slice(0, 300);
    try {
      const json = JSON.parse(text);
      detail = json.error ?? JSON.stringify(json).slice(0, 300);
      if (json.estimated_time) detail += ` (estimated_time: ${json.estimated_time}s)`;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`HF Inference API ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/** Concatenate two 16-bit PCM WAV clips: keep A's header, patch its sizes. */
export function concatWav(a: Buffer, b: Buffer): Buffer {
  const HEADER = 44; // canonical PCM WAV header length
  if (a.length < HEADER || b.length < HEADER) return a;
  const dataB = b.subarray(HEADER);
  const out = Buffer.concat([a, dataB]);
  const dataLen = out.length - HEADER;
  out.writeUInt32LE(out.length - 8, 4); // RIFF chunk size
  out.writeUInt32LE(dataLen, 40); // data chunk size
  return out;
}

async function callWithRetry(prompt: string): Promise<Buffer> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callHuggingFace(prompt);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("MusicGen request failed");
}

/**
 * Generate audio for a job: build prompt -> call MusicGen (one or two
 * ~10s chunks depending on durationSeconds) -> upload to R2 -> update job +
 * create a private track row. On final failure the job is marked "failed"
 * with an error message the polling page can surface.
 */
export async function generateTrack(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const prompt = buildPrompt(job);
  const startedAt = new Date();

  const recordMetric = async (status: "complete" | "failed", errorMessage: string | null) => {
    const completedAt = new Date();
    await prisma.generationMetric.create({
      data: {
        generationJobId: jobId,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        status,
        errorMessage,
      },
    }).catch(() => {});
  };

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "processing", prompt, errorMessage: null },
  });

  const chunks = Math.min(
    Math.ceil(job.durationSeconds / SECONDS_PER_CALL),
    Math.max(...ALLOWED_DURATIONS) / SECONDS_PER_CALL,
  );

  let audio: Buffer | null = null;
  try {
    for (let i = 0; i < chunks; i++) {
      const part = await callWithRetry(prompt);
      audio = audio ? concatWav(audio, part) : part;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "MusicGen request failed";
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    await recordMetric("failed", message);
    return;
  }

  const key = trackKey(job.userId, jobId).replace(/\.mp3$/, ".wav");
  try {
    await putObject(key, audio!, "audio/wav");
    // SigV4 presigned GET, max validity 7 days. Permanent access is a follow-up
    // (public bucket or download-through route).
    const audioUrl = await createDownloadUrl(key, 604_800);

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", audioUrl },
    });

    await prisma.track.create({
      data: {
        generationJobId: job.id,
        userId: job.userId,
        title: `${job.raga} alapana`,
        raga: job.raga,
        tala: job.tala,
        audioUrl,
        fileSizeBytes: BigInt(audio!.length),
        isPublic: false,
      },
    });
    await recordMetric("complete", null);
  } catch (err) {
    const message = `Audio upload failed: ${err instanceof Error ? err.message : String(err)}`;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    await recordMetric("failed", message);
  }
}
