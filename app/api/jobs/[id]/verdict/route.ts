import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const verdict = body?.verdict;
  if (verdict !== "right" && verdict !== "wrong") {
    return NextResponse.json(
      { error: "verdict must be 'right' or 'wrong'" },
      { status: 400 },
    );
  }

  const job = await prisma.generationJob.findFirst({
    where: { id: params.id, userId: session.user.id, inputSource: "voice_sample" },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await prisma.generationJob.update({
    where: { id: job.id },
    data: { humVerdict: verdict },
  });
  return NextResponse.json({ ok: true });
}
