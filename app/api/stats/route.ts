import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RAGA_CATALOG } from "@/lib/raga-engine/catalog";

/**
 * Aggregated hum-match stats for the raga explorer + dashboard:
 * per-raga match counts, verdict splits, mean confidence; plus totals.
 */
export async function GET() {
  try {
    const grouped = await prisma.humMatch.groupBy({
      by: ["guessedRaga", "verdict"],
      _count: { _all: true },
      _avg: { confidence: true },
    });

    const stats = new Map<
      string,
      { raga: string; kind: string; matched: number; right: number; wrong: number; avgConfidence: number | null }
    >();
    for (const g of grouped) {
      const entry =
        stats.get(g.guessedRaga) ?? {
          raga: g.guessedRaga,
          kind: RAGA_CATALOG.find((e) => e.name === g.guessedRaga)?.kind ?? "janya",
          matched: 0, right: 0, wrong: 0, avgConfidence: null,
        };
        entry.matched += g._count._all;
        if (g.verdict === "right") entry.right += g._count._all;
        if (g.verdict === "wrong") entry.wrong += g._count._all;
        if (g._avg.confidence != null) entry.avgConfidence = g._avg.confidence;
      stats.set(g.guessedRaga, entry);
    }

    const total = await prisma.humMatch.count();
    const judged = await prisma.humMatch.count({ where: { verdict: { not: null } } });
    const right = await prisma.humMatch.count({ where: { verdict: "right" } });

    return NextResponse.json({
      ragaStats: Array.from(stats.values()).sort((a, b) => b.matched - a.matched),
      totals: { matches: total, judged, right, accuracy: judged > 0 ? right / judged : null },
    });
  } catch {
    return NextResponse.json({ error: "stats unavailable" }, { status: 500 });
  }
}
