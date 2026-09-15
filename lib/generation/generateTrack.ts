import { prisma } from "@/lib/prisma";
import { putObject, createDownloadUrl, trackKey } from "@/lib/storage/r2";

/**
 * Real music generation via the Hugging Face Inference API
 * (facebook/musicgen-small, free tier).
 *
 * Request:
 *   POST https://router.huggingface.co/hf-inference/models/facebook/musicgen-small
 *   Authorization: Bearer ${HF_API_TOKEN}
 *   Content-Type: application/json
 *   Body: { "inputs": "<prompt built from raga + tala + mood + genre + lyrics>" }
 *
 * Response:
 *   200 -> audio bytes (musicgen returns a WAV/FLAC clip)
 *   503 -> { "error": "Model ... is currently loading", "estimated_time": <secs> }
 *   401 -> invalid token
 */

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small";
const HF_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2; // initial try + one retry

/** Build the MusicGen text prompt from the job's musical parameters. */
export function buildPrompt(job: {
  lyrics: string;
  mood: string;
  genre: string;
  raga: string;
  tala: string;
}): string {
  const beats = job.tala.match(/\((\d+) beats\)/)?.[1];
  return [
    `Carnatic instrumental in raga ${job.raga}`,
    `veena lead with Carnatic vocal ornamentation, mridangam and violin accompaniment`,
    `${job.mood} ${job.genre} character`,
    beats ? `${beats}-beat tala cycle (${job.tala.replace(/\s*\(\d+ beats\)/, "")})` : `tala cycle: ${job.tala}`,
    `inspired by lyrics: ${job.lyrics.slice(0, 200)}`,
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

/**
 * Generate audio for a job: build prompt -> call MusicGen -> upload to R2 ->
 * update job + create a private track row. On final failure the job is marked
 * "failed" with an error message the polling page can surface.
 */
export async function generateTrack(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const prompt = buildPrompt(job);

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "processing", prompt, errorMessage: null },
  });

  let audio: Buffer | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !audio; attempt++) {
    try {
      audio = await callHuggingFace(prompt);
    } catch (err) {
      lastError = err;
    }
  }

  if (!audio) {
    const message =
      lastError instanceof Error ? lastError.message : "MusicGen request failed";
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    return;
  }

  const key = trackKey(job.userId, jobId).replace(/\.mp3$/, ".wav");
  try {
    await putObject(key, audio, "audio/wav");
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
        title: `${job.raga} sketch`,
        raga: job.raga,
        tala: job.tala,
        audioUrl,
        isPublic: false,
      },
    });
  } catch (err) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: `Audio upload failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    });
  }
}
