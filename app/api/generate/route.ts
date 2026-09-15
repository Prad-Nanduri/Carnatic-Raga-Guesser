import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selectRagaTala } from "@/lib/raga-engine/select";
import { generateTrack } from "@/lib/generation/generateTrack";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { lyrics, mood, genre, ragaOverride } = body ?? {};
  if (!lyrics || !mood || !genre) {
    return NextResponse.json(
      { error: "lyrics, mood and genre are required" },
      { status: 400 },
    );
  }

  const { raga, tala } = selectRagaTala(mood, genre, ragaOverride);

  const job = await prisma.generationJob.create({
    data: {
      userId: session.user.id,
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
