"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";
import HumIt, { type HumResult } from "@/components/HumIt";
import ScalePlayer from "@/components/ScalePlayer";
import PitchContour from "@/components/PitchContour";
import Recordings from "@/components/Recordings";
import KolamRule from "@/components/KolamRule";
import { RAGA_CATALOG } from "@/lib/raga-engine/catalog";
import { RAGA_DATA } from "@/lib/raga-engine/select";

const MELAKARTA = RAGA_CATALOG.filter((r) => r.kind === "melakarta").map((r) => r.name);
const JANYA = RAGA_CATALOG.filter((r) => r.kind === "janya").map((r) => r.name);

interface Match {
  raga: string;
  confidence: number | null;
  semis: number[];
  hist: number[];
  matchId: string | null;
}

export default function Home() {
  const [match, setMatch] = useState<Match | null>(null);
  const [verdict, setVerdict] = useState<"right" | "wrong" | "wrong-pending" | null>(null);
  const [meantRaga, setMeantRaga] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function recordMatch(raga: string, confidence: number | null): Promise<string | null> {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raga, confidence }),
      });
      const d = (await res.json().catch(() => null)) as { matchId?: string } | null;
      return d?.matchId ?? null;
    } catch {
      return null;
    }
  }

  async function pickFromHum(result: HumResult) {
    const matchId = await recordMatch(result.raga, result.confidence);
    setVerdict(null);
    setMeantRaga("");
    setMatch({ raga: result.raga, confidence: result.confidence, semis: result.semis, hist: result.hist, matchId });
    document.getElementById("match")?.scrollIntoView({ behavior: "smooth" });
  }

  async function pickManual(raga: string) {
    if (!raga) return;
    const matchId = await recordMatch(raga, null);
    setVerdict(null);
    setMeantRaga("");
    setMatch({ raga, confidence: null, semis: [], hist: [], matchId });
    document.getElementById("match")?.scrollIntoView({ behavior: "smooth" });
  }

  async function sendVerdict(v: "right" | "wrong") {
    if (!match?.matchId || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/matches/${match.matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict: v,
          confirmedRaga: v === "wrong" ? meantRaga || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setVerdict(v);
    } catch {
      setErr("Couldn't save your verdict — the match still works, the vote just didn't count.");
    } finally {
      setBusy(false);
    }
  }

  const theory = match ? RAGA_DATA[match.raga] : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <section className="text-center">
          <h1 className="font-display text-4xl text-ink sm:text-5xl">
            Hum a phrase. Find the raga.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Ragaforge listens to your humming, finds the closest Carnatic ragas
            in our catalog of {RAGA_CATALOG.length}, then plays you the scale
            and real alapana performances — and learns from whether its guess
            was right.
          </p>
        </section>

        <KolamRule />

        <section className="card mt-8">
          <h2 className="font-display text-xl text-ink">Hum it</h2>
          <div className="mt-3">
            <HumIt onPick={pickFromHum} />
          </div>
        </section>

        <section className="card mt-6">
          <label className="label" htmlFor="manual-raga">
            Or pick a raga directly
          </label>
          <select
            id="manual-raga"
            className="input mt-1"
            defaultValue=""
            onChange={(e) => pickManual(e.target.value)}
          >
            <option value="" disabled>
              Browse {RAGA_CATALOG.length} ragas…
            </option>
            <optgroup label="Melakarta (72 parent scales)">
              {MELAKARTA.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </optgroup>
            <optgroup label="Janya (derived ragas)">
              {JANYA.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </optgroup>
          </select>
        </section>

        {match && theory && (
          <section id="match" className="card mt-8 scroll-mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">{match.raga}</h2>
              {match.confidence != null && (
                <span className="subtle">{Math.round(match.confidence * 100)}% match</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Ārohaṇa: <span className="font-medium text-ink">{theory.arohana}</span>
              <br />
              Avarohaṇa: <span className="font-medium text-ink">{theory.avarohana}</span>
            </p>

            <div className="mt-4">
              <ScalePlayer raga={match.raga} />
            </div>

            {match.hist.length > 0 && (
              <div className="mt-6">
                <h3 className="label">Match evidence</h3>
                <PitchContour semis={match.semis} hist={match.hist} raga={match.raga} />
              </div>
            )}

            <div className="mt-6 rounded-md border border-line bg-sand/60 p-4">
              <h3 className="label">Was the guess right?</h3>
              {verdict == null ? (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" disabled={busy}
                      onClick={() => sendVerdict("right")}>
                      Yes, that&rsquo;s my raga
                    </button>
                    <button type="button" className="btn-ghost" disabled={busy}
                      onClick={() => setVerdict("wrong-pending")}>
                      Not quite
                    </button>
                  </div>
                </div>
              ) : verdict === "right" ? (
                <p className="mt-2 text-sm text-ink-soft">
                  Marked correct — your verdict trains our match-accuracy stats.
                </p>
              ) : null}
              {verdict === "wrong-pending" && (
                <div className="mt-2 flex flex-col gap-2">
                  <label className="label" htmlFor="meant-raga">
                    Which raga did you mean? (optional)
                  </label>
                  <select id="meant-raga" className="input" value={meantRaga}
                    onChange={(e) => setMeantRaga(e.target.value)}>
                    <option value="">Not sure / skip</option>
                    {[...MELAKARTA, ...JANYA].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" disabled={busy}
                      onClick={() => sendVerdict("wrong")}>
                      Save verdict
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setVerdict(null)}>
                      Back
                    </button>
                  </div>
                </div>
              )}
              {verdict === "wrong" && (
                <p className="mt-2 text-sm text-ink-soft">
                  Thanks — recorded as a miss. Hum again or explore the correct raga.
                </p>
              )}
              {err && <p className="mt-2 text-sm text-danger">{err}</p>}
            </div>

            <div className="mt-6">
              <h3 className="label">Real alapana performances</h3>
              <Recordings raga={match.raga} />
            </div>
          </section>
        )}
      </main>
      <TempleFooter />
    </div>
  );
}
