import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRaga } from "@/lib/raga-engine/select";

/**
 * PATCH /api/matches/[id] — record the user's verdict on a match
 * (was the suggested raga right/wrong?) and optionally the raga they
 * actually meant (confirmedRaga, used on 'wrong' verdicts).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const verdict = body?.verdict === "right" || body?.verdict === "wrong" ? body.verdict : null;
  const confirmed =
    typeof body?.confirmedRaga === "string" ? resolveRaga(body.confirmedRaga) : null;

  if (!verdict) {
    return NextResponse.json({ error: "verdict must be 'right' or 'wrong'" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  try {
    const match = await prisma.humMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: "match not found" }, { status: 404 });
    // User-owned matches can only be judged by their owner; anonymous
    // matches are open (they carry no identity to verify against).
    if (match.userId && match.userId !== session?.user?.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await prisma.humMatch.update({
      where: { id },
      data: {
        verdict,
        confirmedRaga: confirmed ?? (verdict === "right" ? match.guessedRaga : match.confirmedRaga),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "could not record verdict" }, { status: 500 });
  }
}
