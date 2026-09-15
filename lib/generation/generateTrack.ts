import { prisma } from "@/lib/prisma";
import { putObject, createDownloadUrl, trackKey } from "@/lib/storage/r2";
import { RAGA_DATA } from "@/lib/raga-engine/select";
import { parseScale } from "@/lib/synthesis/scales";
import { generateAlapana } from "@/lib/synthesis/melody";
import { renderAlapana, SAMPLE_RATE } from "@/lib/synthesis/synth";
import { encodeWav } from "@/lib/synthesis/wav";
import { generateViaMusicGen } from "@/lib/generation/musicgenSpace";

/**
 * Two generation engines:
 *
 * - "procedural" (default): rule-based alapana synthesis. The melody is
 *   generated from the raga's actual arohana/avarohana grammar and
 *   characteristic phrases, then rendered by a continuous-pitch additive
 *   synthesizer (jaru slides, kampita gamaka oscillation, per-instrument
 *   partial tables, tanpura drone). Free, deterministic, and provably
 *   raga-faithful — no external API.
 *
 * - "musicgen" (experimental): the public facebook/MusicGen HF Space via
 *   the Gradio client. Real ML audio but shared-queue latency, possible
 *   Space sleep, and no raga fidelity — the model doesn't know ragas.
 *   Clearly labeled experimental in the UI.
 *
 * Duration: the procedural engine renders the requested length natively;
 * MusicGen Spaces return whatever a single prediction yields (~10s), so
 * the 10s option is the honest match there.
 */

export const ALLOWED_DURATIONS = [10, 20, 30] as const;

const INSTRUMENT_TIMBRE: Record<string, string> = {
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
  raga: string;
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

/** Procedural engine: raga scale → alapana score → WAV bytes. */
function renderProcedural(job: {
  raga: string;
  instrument: string;
  durationSeconds: number;
}): Buffer {
  const theory = RAGA_DATA[job.raga];
  const scale = parseScale(theory.arohana, theory.avarohana);
  const melody = generateAlapana(scale, job.durationSeconds);
  const pcm = renderAlapana(melody, job.instrument, job.durationSeconds);
  return encodeWav(pcm, SAMPLE_RATE);
}

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

  let audio: Buffer;
  try {
    audio =
      job.engine === "musicgen"
        ? await generateViaMusicGen(prompt)
        : renderProcedural(job);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Generation failed";
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    await recordMetric("failed", message);
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
        title: `${job.raga} alapana`,
        raga: job.raga,
        tala: job.tala,
        audioUrl,
        fileSizeBytes: BigInt(audio.length),
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
