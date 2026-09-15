"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";
import HumIt from "@/components/HumIt";
import { RAGA_CATALOG } from "@/lib/raga-engine/catalog";

const MELAKARTA_RAGAS = RAGA_CATALOG.filter((r) => r.kind === "melakarta").map((r) => r.name);
const JANYA_RAGAS = RAGA_CATALOG.filter((r) => r.kind === "janya").map((r) => r.name);
const INSTRUMENTS: { value: string; label: string }[] = [
  { value: "veena", label: "Veena" },
  { value: "violin", label: "Violin" },
  { value: "venu_flute", label: "Venu (bamboo flute)" },
  { value: "nadaswaram", label: "Nadaswaram" },
  { value: "saxophone", label: "Saxophone" },
  { value: "voice", label: "Voice (experimental)" },
  { value: "sitar_fusion", label: "Sitar — Hindustani-style fusion" },
];
const DURATIONS = [10, 20, 30];
const ENGINES = [
  { value: "procedural", label: "Raga engine", hint: "synthesizes the alapana from the raga's actual scale — reliable" },
  { value: "musicgen", label: "MusicGen", hint: "experimental ML via a public HF Space — flaky, doesn't know ragas, ~10s only" },
];
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
  const [guessed, setGuessed] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("veena");
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [engine, setEngine] = useState("procedural");
  const [mood, setMood] = useState(MOODS[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let res: Response;
    try {
      res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationMode: "alapana",
          raga: raga || undefined,
          instrument,
          mood,
          genre,
          engine,
          durationSeconds: engine === "musicgen" ? 10 : durationSeconds,
          inputSource: confidence != null ? "voice_sample" : "manual_selection",
          ragaSuggestionConfidence: confidence,
          ragaGuessed: guessed,
        }),
      });
    } catch {
      setLoading(false);
      setError("Network error — could not reach the server.");
      return;
    }
    setLoading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    let data: { jobId?: string; error?: string };
    try {
      data = await res.json();
    } catch {
      setError(`Server error ${res.status} — the service may be misconfigured.`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? `Generation failed (${res.status})`);
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
              onChange={(e) => {
                setRaga(e.target.value);
                setConfidence(null);
                setGuessed(null);
              }}
              className="field"
            >
              <option value="">Choose — or hum below</option>
              <optgroup label="Melakarta (parent ragas)">
                {MELAKARTA_RAGAS.map((r) => <option key={r}>{r}</option>)}
              </optgroup>
              <optgroup label="Janya (derived ragas)">
                {JANYA_RAGAS.map((r) => <option key={r}>{r}</option>)}
              </optgroup>
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
              setGuessed(r);
            }}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="label">Generation engine</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="field"
            >
              {ENGINES.map((en) => (
                <option key={en.value} value={en.value}>{en.label}</option>
              ))}
            </select>
            <span className="subtle">
              {ENGINES.find((en) => en.value === engine)?.hint}
            </span>
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
          <fieldset className="flex flex-col gap-2">
            <span className="label">Duration</span>
            <div className="flex gap-3">
              {(engine === "musicgen" ? [10] : DURATIONS).map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm ${
                    (engine === "musicgen" ? 10 : durationSeconds) === d
                      ? "border-maroon bg-sand text-ink"
                      : "border-line text-ink-soft"
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={d}
                    checked={(engine === "musicgen" ? 10 : durationSeconds) === d}
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
