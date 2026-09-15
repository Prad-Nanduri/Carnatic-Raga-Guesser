import { prisma } from "@/lib/prisma";
import LatencyChart from "@/components/LatencyChart";
import SiteHeader from "@/components/SiteHeader";

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
  const successRate = total ? `${((complete / total) * 100).toFixed(1)}%` : "—";

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

  const stats: [string, string][] = [
    ["Generations", String(total)],
    ["Success rate", successRate],
    ["Failures", String(failed)],
    ["p50 latency", fmtMs(percentile(durations, 50))],
    ["p95 latency", fmtMs(percentile(durations, 95))],
    ["R2 storage", fmtBytes(storageBytes)],
  ];

  return (
    <main className="page-wrap max-w-4xl">
      <SiteHeader />

      <h1 className="heading mt-12">Metrics</h1>
      <p className="subtle mt-2">
        Real numbers from every generation job, computed at page load.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-4">
            <dt className="label">{label}</dt>
            <dd className="mt-1 font-display text-2xl text-maroon">{value}</dd>
          </div>
        ))}
      </dl>

      {chartData.length > 0 && (
        <section className="mt-10">
          <h2 className="heading text-xl">Recent generation latency</h2>
          <div className="card mt-4 p-4">
            <LatencyChart data={chartData} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="heading text-xl">Last 20 generations</h2>
        {last20.length === 0 ? (
          <p className="subtle mt-4">No generations recorded yet.</p>
        ) : (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label px-4 py-3 font-semibold">Raga</th>
                  <th className="label px-4 py-3 font-semibold">Status</th>
                  <th className="label px-4 py-3 font-semibold">Duration</th>
                  <th className="label px-4 py-3 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody>
                {last20.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium">{m.generationJob.raga}</td>
                    <td className="px-4 py-2.5">
                      <span className={m.status === "failed" ? "text-danger" : ""}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtMs(m.durationMs)}</td>
                    <td className="px-4 py-2.5 subtle tabular-nums">
                      {m.startedAt.toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
