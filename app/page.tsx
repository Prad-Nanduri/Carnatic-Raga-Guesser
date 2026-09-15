"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import TempleFooter from "@/components/TempleFooter";

const MOODS = [
  "uplifting", "melancholic", "pleasant", "serious",
  "romantic", "energetic", "peaceful", "nostalgic",
];
const GENRES = [
  "devotional", "devotional-pathos", "universal", "contemplative",
  "tender", "triumphant", "meditative", "longing",
];
const RAGAS = [
  "Hamsadhwani", "Sindhubhairavi", "Mohanam", "Kharaharapriya",
  "Kalyani", "Nattai", "Shanmukhapriya", "Shubhapantuvarali",
];

export default function Home() {
  const router = useRouter();
  const [lyrics, setLyrics] = useState("");
  const [mood, setMood] = useState(MOODS[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [ragaOverride, setRagaOverride] = useState("");
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
        lyrics,
        mood,
        genre,
        ragaOverride: ragaOverride || undefined,
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
          Lyrics in, raga out.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Write or paste lyrics, choose a mood and a genre, and Ragaforge picks
          the raga and tala — then composes a Carnatic-inspired instrumental:
          veena at the lead, mridangam and violin in accompaniment.
        </p>
      </section>

      <form onSubmit={submit} className="card mt-10 flex flex-col gap-6 p-6 sm:p-8">
        <label className="flex flex-col gap-2">
          <span className="label">Lyrics</span>
          <textarea
            required
            rows={6}
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

        <label className="flex flex-col gap-2">
          <span className="label">Raga override · optional</span>
          <select
            value={ragaOverride}
            onChange={(e) => setRagaOverride(e.target.value)}
            className="field"
          >
            <option value="">Let the engine choose</option>
            {RAGAS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Composing…" : "Compose the track"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>

      <TempleFooter />
    </main>
  );
}
