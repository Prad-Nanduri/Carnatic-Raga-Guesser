import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const isPublic = body?.isPublic !== false; // default: publish

  const track = await prisma.track.findUnique({ where: { id: params.id } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  if (track.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.track.update({
    where: { id: params.id },
    data: { isPublic },
  });
  return NextResponse.json(updated);
}
