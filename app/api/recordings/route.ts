import { NextRequest, NextResponse } from "next/server";

/**
 * Real alapana recordings: scrapes YouTube search results for
 * "<raga> alapana <instrument>" and returns the top video IDs + titles —
 * no API key needed. Results are cached per query for an hour.
 */

interface Video {
  id: string;
  title: string;
}

const cache = new Map<string, { at: number; videos: Video[] }>();
const CACHE_MS = 60 * 60 * 1000;

function parseVideos(html: string): Video[] {
  const marker = "var ytInitialData = ";
  const i = html.indexOf(marker);
  if (i < 0) return [];
  let depth = 0;
  let start = -1;
  for (let j = i + marker.length; j < html.length; j++) {
    const c = html[j];
    if (c === "{") { if (start < 0) start = j; depth++; }
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          const data = JSON.parse(html.slice(start, j + 1));
          const out: Video[] = [];
          const walk = (node: unknown): void => {
            if (!node || typeof node !== "object") return;
            const n = node as Record<string, unknown>;
            if (n.videoRenderer) {
              const v = n.videoRenderer as Record<string, unknown>;
              const title =
                ((v.title as Record<string, unknown>)?.runs as { text: string }[])?.[0]?.text ?? "";
              if (typeof v.videoId === "string" && title) out.push({ id: v.videoId, title });
            }
            for (const k of Object.keys(n)) walk(n[k]);
          };
          walk(data);
          return out;
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  const raga = req.nextUrl.searchParams.get("raga") ?? "";
  const instrument = req.nextUrl.searchParams.get("instrument") ?? "";
  if (!raga.trim()) {
    return NextResponse.json({ error: "raga is required" }, { status: 400 });
  }

  const query = `${raga} alapana ${instrument}`.trim();
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ videos: hit.videos });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    const videos = parseVideos(await res.text()).slice(0, 6);
    cache.set(key, { at: Date.now(), videos });
    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recordings unavailable" },
      { status: 502 },
    );
  }
}
