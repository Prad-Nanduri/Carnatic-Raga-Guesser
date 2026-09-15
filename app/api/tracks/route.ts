import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
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

  return NextResponse.json({
    tracks,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    ragas: ragas.map((r) => r.raga),
  });
}
