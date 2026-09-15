"use client";

import { useCallback, useEffect, useState } from "react";
import WaveformPlayer from "@/components/WaveformPlayer";
import SiteHeader from "@/components/SiteHeader";

interface Track {
  id: string;
  title: string;
  raga: string;
  tala: string | null;
  audioUrl: string;
  playCount: number;
  createdAt: string;
  _count: { likes: number };
  user: { name: string };
  generationJob: {
    generationMode: "alapana" | "kriti";
    instrument: string;
    durationSeconds: number;
  };
}

interface RagaStat {
  raga: string;
  kind: string;
  generated: number;
  humMatched: number;
  verdictRight: number;
  verdictWrong: number;
}

interface TracksResponse {
  tracks: Track[];
  page: number;
  totalPages: number;
  total: number;
  ragas: string[];
  ragaStats: RagaStat[];
}

export default function GalleryPage() {
  const [data, setData] = useState<TracksResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [raga, setRaga] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (raga) params.set("raga", raga);
    const res = await fetch(`/api/tracks?${params}`);
    if (!res.ok) {
      setLoadError("Could not load the gallery — the service may be offline.");
      return;
    }
    setLoadError("");
    setData(await res.json());
  }, [page, raga]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="page-wrap">
      <SiteHeader />

      <div className="mt-12">
        <h1 className="heading">Raga explorer</h1>
        <p className="subtle mt-2">
          Which ragas have been generated — and how often hum-matching guessed
          them right.
        </p>
      </div>

      {loadError && <p className="mt-6 text-sm text-danger">{loadError}</p>}

      {data && data.ragaStats.length > 0 && (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="label px-4 py-3 font-semibold">Raga</th>
                <th className="label px-4 py-3 font-semibold">Kind</th>
                <th className="label px-4 py-3 font-semibold">Generated</th>
                <th className="label px-4 py-3 font-semibold">Hum-matched</th>
                <th className="label px-4 py-3 font-semibold">Guess right</th>
                <th className="label px-4 py-3 font-semibold">Guess wrong</th>
              </tr>
            </thead>
            <tbody>
              {data.ragaStats.map((s) => (
                <tr key={s.raga} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">{s.raga}</td>
                  <td className="px-4 py-2.5 subtle">{s.kind}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.generated}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.humMatched}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.verdictRight}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.verdictWrong}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="heading text-xl">Public tracks</h2>
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

      {!data && !loadError ? (
        <p className="subtle mt-10">Loading…</p>
      ) : data && data.tracks.length === 0 ? (
        <p className="subtle mt-10">No public tracks yet.</p>
      ) : data ? (
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
                {t.generationJob.generationMode === "alapana"
                  ? "Alapana"
                  : "Kriti"}{" "}
                · {t.raga}
                {t.tala ? ` · ${t.tala}` : ""}
                {" · "}
                {t.generationJob.instrument.replace("_", " ")} ·{" "}
                {t.generationJob.durationSeconds}s · by {t.user.name}
              </p>
              <div className="mt-4"><WaveformPlayer src={t.audioUrl} /></div>
            </li>
          ))}
        </ul>
      ) : null}

      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-ghost"
          >
            Previous
          </button>
          <span className="subtle">Page {page} of {data.totalPages}</span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-ghost"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
