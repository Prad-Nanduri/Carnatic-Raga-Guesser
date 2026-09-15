import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const track = await prisma.track.findUnique({ where: { id: params.id } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const like = await prisma.trackLike.upsert({
    where: { trackId_userId: { trackId: params.id, userId: session.user.id } },
    create: { trackId: params.id, userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ liked: true, id: like.id });
}
