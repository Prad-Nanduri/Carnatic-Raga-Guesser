"use client";

import { useCallback, useEffect, useState } from "react";
import WaveformPlayer from "@/components/WaveformPlayer";
import SiteHeader from "@/components/SiteHeader";

interface Track {
  id: string;
  title: string;
  raga: string;
  tala: string;
  audioUrl: string;
  playCount: number;
  createdAt: string;
  _count: { likes: number };
  user: { name: string };
}

interface TracksResponse {
  tracks: Track[];
  page: number;
  totalPages: number;
  total: number;
  ragas: string[];
}

export default function GalleryPage() {
  const [data, setData] = useState<TracksResponse | null>(null);
  const [raga, setRaga] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (raga) params.set("raga", raga);
    const res = await fetch(`/api/tracks?${params}`);
    if (res.ok) setData(await res.json());
  }, [page, raga]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="page-wrap">
      <SiteHeader />

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading">Gallery</h1>
          <p className="subtle mt-2">
            Public tracks, composed by raga and tala.
          </p>
        </div>
        <label className="flex items-center gap-3">
          <span className="label">Raga</span>
          <select
            value={raga}
            onChange={(e) => { setRaga(e.target.value); setPage(1); }}
            className="field w-44"
          >
            <option value="">All ragas</option>
            {data?.ragas.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>

      {!data ? (
        <p className="subtle mt-10">Loading…</p>
      ) : data.tracks.length === 0 ? (
        <p className="subtle mt-10">No public tracks yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-5">
          {data.tracks.map((t) => (
            <li key={t.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display text-lg text-maroon">{t.title}</p>
                <p className="label shrink-0">
                  {t._count.likes} likes · {t.playCount} plays
                </p>
              </div>
              <p className="subtle mt-1">
                {t.raga} · {t.tala} · by {t.user.name}
              </p>
              <div className="mt-4"><WaveformPlayer src={t.audioUrl} /></div>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost"
          >
            Prev
          </button>
          <span className="subtle">Page {data.page} of {data.totalPages}</span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
