import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RAGA_CATALOG } from "@/lib/raga-engine/catalog";

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tracks query failed" },
      { status: 500 },
    );
  }
}

async function handle(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raga = searchParams.get("raga")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const where = {
    isPublic: true,
    ...(raga ? { raga: { equals: raga, mode: "insensitive" as const } } : {}),
  };

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        raga: true,
        tala: true,
        audioUrl: true,
        playCount: true,
        createdAt: true,
        _count: { select: { likes: true } },
        user: { select: { name: true } },
        generationJob: {
          select: {
            generationMode: true,
            instrument: true,
            durationSeconds: true,
          },
        },
      },
    }),
    prisma.track.count({ where }),
  ]);

  const ragas = await prisma.track.findMany({
    where: { isPublic: true },
    select: { raga: true },
    distinct: ["raga"],
    orderBy: { raga: "asc" },
  });

  // Per-raga aggregates for the explorer: how many generations, how many
  // arrived via hum-matching, and user right/wrong verdicts on the guess.
  const jobs = await prisma.generationJob.groupBy({
    by: ["raga", "inputSource", "humVerdict"],
    _count: { _all: true },
  });
  const kindOf = new Map(RAGA_CATALOG.map((e) => [e.name.toLowerCase(), e.kind]));
  const stats = new Map<string, {
    raga: string; kind: string; generated: number; humMatched: number;
    verdictRight: number; verdictWrong: number;
  }>();
  for (const row of jobs) {
    const key = row.raga.toLowerCase();
    const s = stats.get(key) ?? {
      raga: row.raga,
      kind: kindOf.get(key) ?? "janya",
      generated: 0,
      humMatched: 0,
      verdictRight: 0,
      verdictWrong: 0,
    };
    s.generated += row._count._all;
    if (row.inputSource === "voice_sample") s.humMatched += row._count._all;
    if (row.humVerdict === "right") s.verdictRight += row._count._all;
    if (row.humVerdict === "wrong") s.verdictWrong += row._count._all;
    stats.set(key, s);
  }
  const ragaStats = Array.from(stats.values()).sort(
    (a, b) => b.generated - a.generated,
  );

  return NextResponse.json({
    tracks,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    ragas: ragas.map((r) => r.raga),
    ragaStats,
  });
}
