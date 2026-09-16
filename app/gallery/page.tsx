"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import ScalePlayer from "@/components/ScalePlayer";
import Recordings from "@/components/Recordings";
import { RAGA_DATA } from "@/lib/raga-engine/select";

interface RagaStat {
  raga: string;
  kind: string;
  matched: number;
  right: number;
  wrong: number;
  avgConfidence: number | null;
}

interface StatsResponse {
  ragaStats: RagaStat[];
  totals: { matches: number; judged: number; right: number; accuracy: number | null };
}

export default function GalleryPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(setData)
      .catch(() => setLoadError("Could not load raga stats — the service may be offline."));
  }, []);

  const theory = selected ? RAGA_DATA[selected] : null;

  return (
    <main className="page-wrap">
      <SiteHeader />

      <div className="mt-12">
        <h1 className="heading">Raga explorer</h1>
        <p className="subtle mt-2">
          Every raga hum-matched so far — and whether the matcher&rsquo;s guess
          was right. Click a raga to hear its scale and real performances.
        </p>
      </div>

      {loadError && <p className="mt-6 text-sm text-danger">{loadError}</p>}

      {data && (
        <p className="subtle mt-6">
          {data.totals.matches} matches · {data.totals.judged} judged ·{" "}
          {data.totals.accuracy != null
            ? `${Math.round(data.totals.accuracy * 100)}% accuracy`
            : "no verdicts yet"}
        </p>
      )}

      {selected && theory && (
        <div className="card mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl text-maroon">{selected}</h2>
            <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Ārohaṇa: <span className="font-medium text-ink">{theory.arohana}</span>
            <br />
            Avarohaṇa: <span className="font-medium text-ink">{theory.avarohana}</span>
          </p>
          <div className="mt-4"><ScalePlayer raga={selected} /></div>
          <div className="mt-6"><Recordings raga={selected} /></div>
        </div>
      )}

      {!data && !loadError ? (
        <p className="subtle mt-10">Loading…</p>
      ) : data && data.ragaStats.length === 0 ? (
        <p className="subtle mt-10">No matches recorded yet — go hum a phrase.</p>
      ) : data ? (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="label px-4 py-3 font-semibold">Raga</th>
                <th className="label px-4 py-3 font-semibold">Kind</th>
                <th className="label px-4 py-3 font-semibold">Matched</th>
                <th className="label px-4 py-3 font-semibold">Right</th>
                <th className="label px-4 py-3 font-semibold">Wrong</th>
                <th className="label px-4 py-3 font-semibold">Avg confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.ragaStats.map((s) => (
                <tr key={s.raga} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    <button
                      type="button"
                      className="text-maroon underline-offset-2 hover:underline"
                      onClick={() => setSelected(s.raga)}
                    >
                      {s.raga}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 subtle">{s.kind}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.matched}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.right}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.wrong}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {s.avgConfidence != null ? `${Math.round(s.avgConfidence * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
