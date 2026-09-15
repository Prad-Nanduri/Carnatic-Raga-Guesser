import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selectRagaTala, suggestRaga, resolveRaga } from "@/lib/raga-engine/select";
import { generateTrack, ALLOWED_DURATIONS } from "@/lib/generation/generateTrack";

export const maxDuration = 300;

const INSTRUMENTS = ["voice", "violin", "veena", "venu_flute", "sitar_fusion"] as const;

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const mode = body?.generationMode === "kriti" ? "kriti" : "alapana";
  const instrument = INSTRUMENTS.includes(body?.instrument) ? body.instrument : null;
  const durationSeconds = ALLOWED_DURATIONS.includes(body?.durationSeconds)
    ? (body.durationSeconds as number)
    : null;
  const inputSource =
    body?.inputSource === "voice_sample" ? "voice_sample" : "manual_selection";
  const confidence =
    typeof body?.ragaSuggestionConfidence === "number"
      ? body.ragaSuggestionConfidence
      : null;

  if (!instrument) {
    return NextResponse.json({ error: "instrument is required" }, { status: 400 });
  }
  if (!durationSeconds) {
    return NextResponse.json(
      { error: `durationSeconds must be one of ${ALLOWED_DURATIONS.join("/")}` },
      { status: 400 },
    );
  }

  let raga: string | null;
  let tala: string | null = null;
  let lyrics: string | null = null;
  const mood = typeof body?.mood === "string" ? body.mood : null;
  const genre = typeof body?.genre === "string" ? body.genre : null;

  if (mode === "kriti") {
    // Kriti path: composed piece — lyrics, mood, genre required; tala assigned.
    if (!body?.lyrics || !mood || !genre) {
      return NextResponse.json(
        { error: "kriti mode requires lyrics, mood and genre" },
        { status: 400 },
      );
    }
    const sel = selectRagaTala(mood, genre, body.raga);
    raga = sel.raga;
    tala = sel.tala;
    lyrics = body.lyrics;
  } else {
    // Alapana path: raga is king — direct selection wins; mood/genre only
    // nudge the engine when no explicit raga was given.
    raga = typeof body?.raga === "string" ? resolveRaga(body.raga) : null;
    if (!raga && mood && genre) {
      raga = suggestRaga(mood, genre).raga;
    }
    if (!raga) {
      return NextResponse.json(
        { error: "alapana mode requires a raga (or mood+genre for a suggestion)" },
        { status: 400 },
      );
    }
  }

  const job = await prisma.generationJob.create({
    data: {
      userId: session.user.id,
      generationMode: mode,
      instrument,
      durationSeconds,
      inputSource,
      ragaSuggestionConfidence: confidence,
      lyrics,
      mood,
      genre,
      raga,
      tala,
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
