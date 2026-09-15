"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  raga: string;
  tala: string;
  audioUrl: string | null;
  tracks: { id: string }[];
}

export default function GeneratePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        if (!cancelled) setError(res.status === 401 ? "Please log in to view this job." : "Job not found.");
        return;
      }
      const data: Job = await res.json();
      if (cancelled) return;
      setJob(data);
      if (data.status === "pending" || data.status === "processing") {
        setTimeout(poll, 2000);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  if (error) return <main className="p-8"><p>{error}</p><Link href="/" className="underline">Home</Link></main>;
  if (!job) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Generation</h1>
      <p>Status: <strong>{job.status}</strong></p>
      <p>Raga: {job.raga} · Tala: {job.tala}</p>

      {(job.status === "pending" || job.status === "processing") && (
        <p className="mt-4 animate-pulse text-gray-600">Working on it — this page updates automatically.</p>
      )}

      {job.status === "complete" && job.audioUrl && (
        <div className="mt-6">
          <audio controls src={job.audioUrl} className="w-full" />
          {job.tracks[0] && (
            <p className="mt-2 text-sm">
              Track created. <Link className="underline" href="/gallery">Go to gallery</Link>
            </p>
          )}
        </div>
      )}

      {job.status === "failed" && (
        <p className="mt-4 text-red-600">Generation failed. <Link href="/" className="underline">Try again</Link></p>
      )}

      <Link href="/" className="mt-8 inline-block underline">New generation</Link>
    </main>
  );
}
