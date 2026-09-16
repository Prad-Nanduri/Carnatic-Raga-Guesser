import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRaga } from "@/lib/raga-engine/select";

/**
 * Record a hum-match: the raga the matcher suggested (or the user picked
 * from candidates), plus the matcher's confidence. Anonymous matches are
 * allowed — userId attaches when a session exists, so logged-in users
 * accumulate their own match history.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const raga = typeof body?.raga === "string" ? resolveRaga(body.raga) : null;
  const confidence =
    typeof body?.confidence === "number" ? body.confidence : null;

  if (!raga) {
    return NextResponse.json({ error: "a valid raga is required" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  try {
    const match = await prisma.humMatch.create({
      data: {
        userId: session?.user?.id ?? null,
        guessedRaga: raga,
        confidence,
      },
    });
    return NextResponse.json({ matchId: match.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "could not record match" }, { status: 500 });
  }
}
