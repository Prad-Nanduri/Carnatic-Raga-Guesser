import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LatencyChart from "@/components/LatencyChart";

export const dynamic = "force-dynamic";

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function fmtMs(ms: number | null) {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtBytes(bytes: bigint) {
  const n = Number(bytes);
  if (n >= 1 << 30) return `${(n / (1 << 30)).toFixed(2)} GB`;
  if (n >= 1 << 20) return `${(n / (1 << 20)).toFixed(2)} MB`;
  if (n >= 1 << 10) return `${(n / (1 << 10)).toFixed(1)} KB`;
  return `${n} B`;
}

export default async function DashboardPage() {
  const metrics = await prisma.generationMetric.findMany({
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      durationMs: true,
      startedAt: true,
      errorMessage: true,
      generationJob: { select: { raga: true } },
    },
  });

  const durations = metrics
    .map((m) => m.durationMs)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);

  const total = metrics.length;
  const complete = metrics.filter((m) => m.status === "complete").length;
  const failed = metrics.filter((m) => m.status === "failed").length;
  const successRate = total ? ((complete / total) * 100).toFixed(1) : "—";

  const storageAgg = await prisma.track.aggregate({
    _sum: { fileSizeBytes: true },
  });
  const storageBytes = storageAgg._sum.fileSizeBytes ?? BigInt(0);

  const last20 = metrics.slice(0, 20);
  const chartData = [...last20]
    .reverse()
    .map((m) => ({
      name: m.generationJob.raga,
      ms: m.durationMs,
      status: m.status,
    }));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <nav className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Metrics dashboard</h1>
        <Link href="/" className="text-sm underline">Home</Link>
      </nav>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          ["Total generations", String(total)],
          ["Success rate", `${successRate}%`],
          ["Failures", String(failed)],
          ["p50 latency", fmtMs(percentile(durations, 50))],
          ["p95 latency", fmtMs(percentile(durations, 95))],
        ].map(([label, value]) => (
          <div key={label} className="rounded border p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <p className="mb-8 text-sm text-gray-600">
        Estimated R2 storage used: <strong>{fmtBytes(storageBytes)}</strong>
      </p>

      {chartData.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">Recent generation latency</h2>
          <LatencyChart data={chartData} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Last 20 generations</h2>
        {last20.length === 0 ? (
          <p className="text-gray-600">No generations recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1">Raga</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {last20.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-1">{m.generationJob.raga}</td>
                  <td>{m.status}</td>
                  <td>{fmtMs(m.durationMs)}</td>
                  <td>{m.startedAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
