"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

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
  const { data: session } = useSession();
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
    <main className="mx-auto max-w-2xl p-8">
      <nav className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">RagaForge</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/gallery" className="underline">Gallery</Link>
          <Link href="/dashboard" className="underline">Dashboard</Link>
          {session ? (
            <span>{session.user.email}</span>
          ) : (
            <Link href="/login" className="underline">Log in</Link>
          )}
        </div>
      </nav>

      <p className="mb-6 text-gray-600">
        Generate Carnatic-inspired music from your lyrics. Pick a mood and genre;
        the raga/tala engine handles the rest.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Lyrics
          <textarea
            required
            rows={5}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            className="rounded border p-2"
            placeholder="Write or paste your lyrics…"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1">
            Mood
            <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded border p-2">
              {MOODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            Genre
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded border p-2">
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          Raga override (optional)
          <select value={ragaOverride} onChange={(e) => setRagaOverride(e.target.value)} className="rounded border p-2">
            <option value="">— let the engine choose —</option>
            {RAGAS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate track"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  );
}
