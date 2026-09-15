import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selectRagaTala } from "@/lib/raga-engine/select";
import { generateTrack } from "@/lib/generation/generateTrack";

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

  // NOTE: awaited inline for the stub. When the real HF MusicGen call lands,
  // move this to a background job/queue so POST returns immediately.
  try {
    await generateTrack(job.id);
  } catch {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ jobId: job.id, status: "failed" }, { status: 500 });
  }

  const updated = await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } });
  return NextResponse.json({ jobId: updated.id, status: updated.status });
}
