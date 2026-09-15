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
  if (!track.isPublic && track.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Placeholder URLs aren't R2 objects yet; return the stored URL directly.
  // TODO: when real files land in R2, issue createDownloadUrl(key) here instead.
  return NextResponse.json({ url: track.audioUrl });
}
