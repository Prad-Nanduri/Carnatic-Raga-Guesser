"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import WaveformPlayer from "@/components/WaveformPlayer";
import SiteHeader from "@/components/SiteHeader";
import KolamRule from "@/components/KolamRule";

interface Job {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  raga: string;
  tala: string;
  audioUrl: string | null;
  prompt: string | null;
  errorMessage: string | null;
  tracks: { id: string }[];
}

const STATUS_LABEL: Record<Job["status"], string> = {
  pending: "Queued",
  processing: "Composing",
  complete: "Complete",
  failed: "Failed",
};

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

  if (error) {
    return (
      <main className="page-wrap">
        <SiteHeader />
        <p className="mt-12 text-sm text-danger">{error}</p>
        <Link href="/" className="nav-link mt-4 inline-block">Home</Link>
      </main>
    );
  }
  if (!job) {
    return (
      <main className="page-wrap">
        <SiteHeader />
        <p className="subtle mt-12">Loading…</p>
      </main>
    );
  }

  const working = job.status === "pending" || job.status === "processing";

  return (
    <main className="page-wrap">
      <SiteHeader />

      <div className="mt-12 flex items-baseline justify-between gap-4">
        <h1 className="heading">{job.raga}</h1>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            job.status === "failed"
              ? "border-danger text-danger"
              : "border-bronze text-bronze"
          }`}
        >
          {STATUS_LABEL[job.status]}
        </span>
      </div>
      <p className="subtle mt-2">Tala: {job.tala}</p>

      {working && (
        <div className="mt-8">
          <p className="animate-pulse text-sm text-ink-soft">
            Composing — this page updates itself when the track is ready.
          </p>
          <KolamRule className="mt-6" />
        </div>
      )}

      {job.status === "complete" && job.audioUrl && (
        <div className="card mt-8 p-5">
          <WaveformPlayer src={job.audioUrl} />
          {job.tracks[0] && (
            <p className="subtle mt-4">
              Track created.{" "}
              <Link className="nav-link underline" href="/gallery">
                Hear it in the gallery
              </Link>
            </p>
          )}
        </div>
      )}

      {job.status === "failed" && (
        <div className="card mt-8 border-danger p-5">
          <p className="text-sm text-danger">
            Generation failed{job.errorMessage ? `: ${job.errorMessage}` : "."}
          </p>
          <Link href="/" className="nav-link mt-3 inline-block underline">
            Try again
          </Link>
        </div>
      )}

      {job.prompt && (
        <details className="mt-8">
          <summary className="label cursor-pointer select-none">
            Generation prompt
          </summary>
          <p className="subtle mt-2 italic">{job.prompt}</p>
        </details>
      )}

      <Link href="/" className="nav-link mt-10 inline-block underline">
        Compose another
      </Link>
    </main>
  );
}
