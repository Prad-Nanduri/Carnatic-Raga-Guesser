import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestRaga, resolveRaga } from "@/lib/raga-engine/select";
import { generateTrack, ALLOWED_DURATIONS } from "@/lib/generation/generateTrack";

export const maxDuration = 300;

const INSTRUMENTS = [
  "voice", "violin", "veena", "venu_flute",
  "nadaswaram", "saxophone", "sitar_fusion",
] as const;

// Alapana-only flow: unmetered improvisation, no tala, no lyrics.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const instrument = INSTRUMENTS.includes(body?.instrument) ? body.instrument : null;
  const engine = body?.engine === "musicgen" ? "musicgen" : "procedural";
  // MusicGen Spaces return a single ~10s prediction — only 10s is honest.
  const allowedDurations = engine === "musicgen" ? [10] : ALLOWED_DURATIONS;
  const durationSeconds = allowedDurations.includes(body?.durationSeconds)
    ? (body.durationSeconds as number)
    : null;
  const inputSource =
    body?.inputSource === "voice_sample" ? "voice_sample" : "manual_selection";
  const confidence =
    typeof body?.ragaSuggestionConfidence === "number"
      ? body.ragaSuggestionConfidence
      : null;
  const mood = typeof body?.mood === "string" ? body.mood : null;
  const genre = typeof body?.genre === "string" ? body.genre : null;

  if (!instrument) {
    return NextResponse.json({ error: "instrument is required" }, { status: 400 });
  }
  if (!durationSeconds) {
    return NextResponse.json(
      { error: `durationSeconds must be one of ${allowedDurations.join("/")}` },
      { status: 400 },
    );
  }

  // Raga: an explicit selection wins (manual or hum-confirmed); mood/genre
  // only nudge the engine when no raga was given.
  let raga = typeof body?.raga === "string" ? resolveRaga(body.raga) : null;
  if (!raga && mood && genre) {
    raga = suggestRaga(mood, genre).raga;
  }
  if (!raga) {
    return NextResponse.json(
      { error: "a raga is required (pick one, or use hum-it to match)" },
      { status: 400 },
    );
  }

  const job = await prisma.generationJob.create({
    data: {
      userId: session.user.id,
      generationMode: "alapana",
      instrument,
      durationSeconds,
      inputSource,
      engine,
      ragaSuggestionConfidence: confidence,
      humGuessedRaga:
        typeof body?.ragaGuessed === "string" ? body.ragaGuessed : null,
      mood,
      genre,
      raga,
      status: "pending",
    },
  });

  // Run generation after the response so the client can poll /api/jobs/:id.
  // waitUntil keeps the serverless function alive until the work settles.
  waitUntil(
    generateTrack(job.id).catch(async () => {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: "Generation worker crashed" },
      }).catch(() => {});
    }),
  );

  return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
}
