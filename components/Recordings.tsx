"use client";

/**
 * Real alapana performances: pulls YouTube search results for
 * "<raga> alapana <instrument>" from /api/recordings and embeds the top
 * hits via youtube-nocookie. Instrument chips filter the query.
 */

import { useEffect, useState } from "react";

interface Video {
  id: string;
  title: string;
}

const INSTRUMENTS = ["", "veena", "violin", "venu flute", "nadaswaram", "voice"] as const;
const LABELS: Record<string, string> = {
  "": "Any",
  veena: "Veena",
  violin: "Violin",
  "venu flute": "Venu flute",
  nadaswaram: "Nadaswaram",
  voice: "Voice",
};

export default function Recordings({ raga }: { raga: string }) {
  const [instrument, setInstrument] = useState<string>("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/recordings?raga=${encodeURIComponent(raga)}&instrument=${encodeURIComponent(instrument)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((d: { videos?: Video[] }) => {
        if (!cancelled) setVideos(d.videos ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [raga, instrument]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {INSTRUMENTS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInstrument(i)}
            className={`chip ${
              instrument === i
                ? "border-maroon bg-sand text-maroon"
                : "border-line text-ink-soft hover:border-bronze"
            }`}
          >
            {LABELS[i]}
          </button>
        ))}
      </div>
      {loading && <p className="subtle">Finding alapana recordings…</p>}
      {failed && (
        <p className="subtle">
          Couldn&rsquo;t reach YouTube search — try a{" "}
          <a
            className="underline"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${raga} alapana ${instrument}`,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            direct search
          </a>
          .
        </p>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {videos.map((v) => (
          <li key={v.id} className="flex flex-col gap-1">
            <div className="aspect-video w-full overflow-hidden rounded-md border border-line">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.id}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <p className="truncate text-xs text-ink-soft" title={v.title}>
              {v.title}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
