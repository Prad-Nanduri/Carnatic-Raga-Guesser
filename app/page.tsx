"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";
import HumIt, { type HumResult } from "@/components/HumIt";
import ScalePlayer from "@/components/ScalePlayer";
import PitchContour from "@/components/PitchContour";
import Recordings from "@/components/Recordings";
import ScaleChips from "@/components/ScaleChips";
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
        {/* ── Hero: asymmetric split, console on the right ── */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label">Carnatic raga, identified</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Hum a phrase.
              <br />
              Find the <span className="italic text-maroon">raga.</span>
            </h1>
            <p className="mt-5 max-w-[52ch] leading-relaxed text-ink-soft">
              Ragaforge tracks your pitch in the browser, normalizes it to your
              own Sa, and scores it against {RAGA_CATALOG.length} curated
              Carnatic scales — then plays you the scale and real alapana
              performances, and learns from your verdict.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["130+ ragas", "in-browser matching", "audio never uploaded", "human-verified accuracy"].map((t) => (
                <span key={t} className="chip border-line text-ink-soft">{t}</span>
              ))}
            </div>
          </div>

          {/* Recording console */}
          <div className="card relative overflow-hidden p-6 sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent"
            />
            <h2 className="font-display text-2xl text-ink">Hum</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Sing the ārohaṇa &amp; avarohaṇa, or a simple 15-second ālāpana.
            </p>
            <div className="mt-5">
              <HumIt onPick={pickFromHum} />
            </div>
          </div>
        </section>

        {/* Atlas browse — slim bar, not a box */}
        <div className="mt-12 flex flex-wrap items-center gap-4 border-y border-line py-4">
          <label htmlFor="manual-raga" className="label">
            Or browse the atlas
          </label>
          <select
            id="manual-raga"
            className="field max-w-xs"
            defaultValue=""
            onChange={(e) => pickManual(e.target.value)}
          >
            <option value="" disabled>
              All {RAGA_CATALOG.length} ragas…
            </option>
            <optgroup label="Melakarta — the 72 parent scales">
              {MELAKARTA.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </optgroup>
            <optgroup label="Janya — derived ragas">
              {JANYA.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {match && theory && (
          <section id="match" className="card rise mt-12 scroll-mt-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
              <h2 className="font-display text-3xl text-maroon">{match.raga}</h2>
              {match.confidence != null && (
                <span className="flex items-center gap-2">
                  <span className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.round(match.confidence * 100)}%` }} />
                  </span>
                  <span className="subtle tabular-nums">
                    {Math.round(match.confidence * 100)}% match
                  </span>
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <span className="label mr-2">Ārohaṇa</span>
                  <div className="mt-1.5"><ScaleChips scale={theory.arohana} /></div>
                </div>
                <div>
                  <span className="label mr-2">Avarohaṇa</span>
                  <div className="mt-1.5"><ScaleChips scale={theory.avarohana} /></div>
                </div>
                <div className="mt-2">
                  <ScalePlayer raga={match.raga} />
                </div>
                {match.confidence == null && (
                  <p className="subtle">Picked manually — no pitch evidence to show.</p>
                )}
              </div>

              {match.hist.length > 0 && (
                <div>
                  <h3 className="label">Match evidence</h3>
                  <div className="mt-2">
                    <PitchContour semis={match.semis} hist={match.hist} raga={match.raga} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-md border border-line bg-sand/60 p-5">
              <h3 className="label">Was the guess right?</h3>
              {verdict == null ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-primary" disabled={busy}
                    onClick={() => sendVerdict("right")}>
                    Yes, that&rsquo;s my raga
                  </button>
                  <button type="button" className="btn-ghost" disabled={busy}
                    onClick={() => setVerdict("wrong-pending")}>
                    Not quite
                  </button>
                </div>
              ) : verdict === "right" ? (
                <p className="mt-2 text-sm text-ink-soft">
                  Marked correct — your verdict trains our match-accuracy stats.
                </p>
              ) : null}
              {verdict === "wrong-pending" && (
                <div className="mt-3 flex max-w-sm flex-col gap-3">
                  <label className="label" htmlFor="meant-raga">
                    Which raga did you mean? (optional)
                  </label>
                  <select id="meant-raga" className="field" value={meantRaga}
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
                  Thanks — recorded as a miss. Record again or explore the correct raga.
                </p>
              )}
              {err && <p className="mt-2 text-sm text-danger">{err}</p>}
            </div>

            <div className="mt-8">
              <h3 className="label">Real alapana performances</h3>
              <div className="mt-3"><Recordings raga={match.raga} /></div>
            </div>
          </section>
        )}
      </main>
      <TempleFooter />
    </div>
  );
}
