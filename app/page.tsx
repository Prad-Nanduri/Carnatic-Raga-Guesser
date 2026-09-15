"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";

const RAGAS = [
  "Hamsadhwani", "Sindhubhairavi", "Mohanam", "Kharaharapriya",
  "Kalyani", "Nattai", "Shanmukhapriya", "Shubhapantuvarali",
];
const INSTRUMENTS: { value: string; label: string }[] = [
  { value: "veena", label: "Veena" },
  { value: "violin", label: "Violin" },
  { value: "venu_flute", label: "Venu (bamboo flute)" },
  { value: "voice", label: "Voice (experimental)" },
  { value: "sitar_fusion", label: "Sitar — Hindustani-style fusion" },
];
const DURATIONS = [10, 20];
const MOODS = [
  "uplifting", "melancholic", "pleasant", "serious",
  "romantic", "energetic", "peaceful", "nostalgic",
];
const GENRES = [
  "devotional", "devotional-pathos", "universal", "contemplative",
  "tender", "triumphant", "meditative", "longing",
];

export default function Home() {
  const router = useRouter();
  const [raga, setRaga] = useState(RAGAS[0]);
  const [instrument, setInstrument] = useState("veena");
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [kriti, setKriti] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [mood, setMood] = useState(MOODS[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        kriti
          ? {
              generationMode: "kriti",
              raga,
              instrument,
              durationSeconds,
              lyrics,
              mood,
              genre,
            }
          : {
              generationMode: "alapana",
              raga,
              instrument,
              durationSeconds,
              mood,
              genre,
            },
      ),
    });
    setLoading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      return;
    }
    router.push(`/generate/${data.jobId}`);
  }

  return (
    <main className="page-wrap">
      <SiteHeader />

      <section className="mt-12 max-w-xl">
        <h1 className="font-display text-4xl leading-tight tracking-tight text-maroon text-balance">
          Explore a raga, freely.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          An alapana is the unmetered elaboration of a raga — no tala, no
          percussion, just a melodic voice over a tanpura drone. Pick a raga
          and an instrument; Ragaforge improvises the rest.
        </p>
      </section>

      <form onSubmit={submit} className="card mt-10 flex flex-col gap-6 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="label">Raga</span>
            <select value={raga} onChange={(e) => setRaga(e.target.value)} className="field">
              {RAGAS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Melodic voice</span>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="field"
            >
              {INSTRUMENTS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </label>
        </div>
        {instrument === "voice" && (
          <p className="subtle -mt-3">
            Voice is an experimental timbre approximation — this is not
            dedicated singing-voice synthesis.
          </p>
        )}

        <fieldset className="flex flex-col gap-2">
          <span className="label">Duration</span>
          <div className="flex gap-3">
            {DURATIONS.map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm ${
                  durationSeconds === d
                    ? "border-maroon bg-sand text-ink"
                    : "border-line text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="duration"
                  value={d}
                  checked={durationSeconds === d}
                  onChange={() => setDurationSeconds(d)}
                  className="accent-maroon"
                />
                {d}s
              </label>
            ))}
          </div>
          <p className="subtle">Each 10 seconds is one generation pass.</p>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={kriti}
            onChange={(e) => setKriti(e.target.checked)}
            className="accent-maroon"
          />
          Add lyrics for a structured kriti instead
        </label>

        {kriti && (
          <div className="flex flex-col gap-5 border-t border-line pt-5">
            <label className="flex flex-col gap-2">
              <span className="label">Lyrics</span>
              <textarea
                required={kriti}
                rows={5}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="field"
                placeholder="Write or paste your lyrics…"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Mood</span>
                <select value={mood} onChange={(e) => setMood(e.target.value)} className="field">
                  {MOODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Genre</span>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="field">
                  {GENRES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
            </div>
            <p className="subtle">
              Kriti mode composes a metered piece — the engine assigns a tala
              and percussion joins the ensemble.
            </p>
          </div>
        )}

        {!kriti && (
          <p className="subtle -mt-2">
            Optional mood/genre below only steers the character — the raga you
            picked stays the raga.
          </p>
        )}
        {!kriti && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="label">Mood · optional</span>
              <select value={mood} onChange={(e) => setMood(e.target.value)} className="field">
                {MOODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Genre · optional</span>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="field">
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Composing…" : kriti ? "Compose the kriti" : "Begin the alapana"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>

      <TempleFooter />
    </main>
  );
}
