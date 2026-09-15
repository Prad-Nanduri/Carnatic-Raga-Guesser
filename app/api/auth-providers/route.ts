import { NextResponse } from "next/server";

/** Which social sign-in providers are actually configured via env vars. */
export async function GET() {
  return NextResponse.json({
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  });
}
