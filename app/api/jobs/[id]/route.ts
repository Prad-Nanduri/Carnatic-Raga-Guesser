import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const job = await prisma.generationJob.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      raga: true,
      tala: true,
      generationMode: true,
      instrument: true,
      durationSeconds: true,
      inputSource: true,
      ragaSuggestionConfidence: true,
      audioUrl: true,
      prompt: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      tracks: { select: { id: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}
