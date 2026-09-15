import { prisma } from "@/lib/prisma";

/**
 * Stub music-generation pipeline.
 *
 * Currently waits ~2s, marks the job complete, and attaches a placeholder
 * audio URL so the full submit -> poll -> gallery flow works end to end.
 *
 * TODO(real-generation): replace the body below with a Hugging Face
 * Inference API call to `facebook/musicgen-small`.
 *
 * Expected request:
 *   POST https://api-inference.huggingface.co/models/facebook/musicgen-small
 *   Authorization: Bearer ${HF_API_TOKEN}
 *   Content-Type: application/json
 *   Body: { "inputs": "<prompt built from lyrics + raga + tala + mood + genre>" }
 *
 * Expected response:
 *   200 -> audio/wav bytes (the generated clip)
 *   503 -> { "error": "Model ... is currently loading", "estimated_time": <secs> } — retry after delay
 *
 * Post-processing:
 *   1. Upload returned bytes to R2 at `tracks/<userId>/<trackId>.wav`
 *      via lib/storage/r2.ts createUploadUrl().
 *   2. Set job.audioUrl to the object key / presigned download URL.
 */
export async function generateTrack(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const placeholderUrl = `https://placeholder.ragaforge.local/audio/${jobId}.mp3`;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "complete", audioUrl: placeholderUrl },
  });

  // Auto-create a (private) track row so publish/like/download flows work.
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  await prisma.track.create({
    data: {
      generationJobId: job.id,
      userId: job.userId,
      title: `${job.raga} sketch`,
      raga: job.raga,
      tala: job.tala,
      audioUrl: placeholderUrl,
      isPublic: false,
    },
  });
}
