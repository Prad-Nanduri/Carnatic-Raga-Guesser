"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";
import HumIt from "@/components/HumIt";

const RAGAS = [
  "Hamsadhwani", "Sindhubhairavi", "Mohanam", "Kharaharapriya",
  "Kalyani", "Nattai", "Shanmukhapriya", "Shubhapantuvarali",
];
const INSTRUMENTS: { value: string; label: string }[] = [
  { value: "veena", label: "Veena" },
  { value: "violin", label: "Violin" },
  { value: "venu_flute", label: "Venu (bamboo flute)" },
  { value: "nadaswaram", label: "Nadaswaram" },
  { value: "saxophone", label: "Saxophone" },
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
  const [raga, setRaga] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [instrument, setInstrument] = useState("veena");
  const [durationSeconds, setDurationSeconds] = useState(10);
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
      body: JSON.stringify({
        generationMode: "alapana",
        raga: raga || undefined,
        instrument,
        durationSeconds,
        mood,
        genre,
        inputSource: confidence != null ? "voice_sample" : "manual_selection",
        ragaSuggestionConfidence: confidence,
      }),
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
          percussion, just a melodic voice over a tanpura drone. Pick a raga,
          or hum a phrase and we&rsquo;ll suggest one.
        </p>
      </section>

      <form onSubmit={submit} className="card mt-10 flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="label">Raga</span>
            <select
              value={raga}
              onChange={(e) => { setRaga(e.target.value); setConfidence(null); }}
              className="field"
            >
              <option value="">Choose — or hum below</option>
              {RAGAS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          {confidence != null && (
            <p className="subtle">
              Matched from your hum ({Math.round(confidence * 100)}% confidence)
              — change the dropdown to pick differently.
            </p>
          )}
          <HumIt
            onPick={(r, c) => {
              setRaga(r);
              setConfidence(c);
            }}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
          </fieldset>
        </div>
        {instrument === "voice" && (
          <p className="subtle -mt-3">
            Voice is an experimental timbre approximation — this is not
            dedicated singing-voice synthesis.
          </p>
        )}

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
        <p className="subtle -mt-3">
          Mood/genre only steer the character — and pick the raga for you only
          if you haven&rsquo;t chosen one.
        </p>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Composing…" : "Begin the alapana"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>

      <TempleFooter />
    </main>
  );
}
