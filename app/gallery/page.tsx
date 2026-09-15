"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WaveformPlayer from "@/components/WaveformPlayer";

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
    <main className="mx-auto max-w-3xl p-8">
      <nav className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <Link href="/" className="underline text-sm">Home</Link>
      </nav>

      <label className="mb-6 flex items-center gap-2">
        Filter by raga:
        <select
          value={raga}
          onChange={(e) => { setRaga(e.target.value); setPage(1); }}
          className="rounded border p-2"
        >
          <option value="">All ragas</option>
          {data?.ragas.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>

      {!data ? (
        <p>Loading…</p>
      ) : data.tracks.length === 0 ? (
        <p className="text-gray-600">No public tracks yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.tracks.map((t) => (
            <li key={t.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-gray-600">
                    {t.raga} · {t.tala} · by {t.user.name} · {t._count.likes} likes · {t.playCount} plays
                  </p>
                </div>
              </div>
              <div className="mt-2"><WaveformPlayer src={t.audioUrl} /></div>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>Page {data.page} of {data.totalPages}</span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
