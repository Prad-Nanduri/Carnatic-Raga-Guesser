import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

/**
 * Match analytics: how well the hum→raga matcher actually performs —
 * overall accuracy, accuracy by raga, and confidence calibration (do
 * high-confidence guesses get marked right more often?).
 */
export default async function DashboardPage() {
  type Match = {
    id: string;
    guessedRaga: string;
    confirmedRaga: string | null;
    confidence: number | null;
    verdict: string | null;
    createdAt: Date;
  };
  let matches: Match[];
  try {
    matches = await prisma.humMatch.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, guessedRaga: true, confirmedRaga: true,
        confidence: true, verdict: true, createdAt: true,
      },
    });
  } catch (e) {
    return (
      <main className="page-wrap max-w-4xl">
        <SiteHeader />
        <h1 className="heading mt-12">Match analytics</h1>
        <p className="subtle mt-4">
          Stats unavailable — the database is not reachable
          {e instanceof Error ? ` (${e.message.slice(0, 120)})` : ""}.
        </p>
      </main>
    );
  }

  const judged = matches.filter((m) => m.verdict);
  const right = judged.filter((m) => m.verdict === "right").length;
  const accuracy = judged.length > 0 ? right / judged.length : null;

  // Confidence calibration: bucketed confidence vs. hit rate.
  const buckets = [
    { label: "< 40%", lo: 0, hi: 0.4 },
    { label: "40–60%", lo: 0.4, hi: 0.6 },
    { label: "60–80%", lo: 0.6, hi: 0.8 },
    { label: "80%+", lo: 0.8, hi: 1.01 },
  ].map((b) => {
    const inBucket = judged.filter(
      (m) => m.confidence != null && m.confidence >= b.lo && m.confidence < b.hi,
    );
    const r = inBucket.filter((m) => m.verdict === "right").length;
    return { ...b, n: inBucket.length, rate: inBucket.length > 0 ? r / inBucket.length : null };
  });

  // Misses with a confirmed raga — where does the matcher confuse?
  const confusions = matches
    .filter((m) => m.verdict === "wrong" && m.confirmedRaga)
    .reduce<Map<string, number>>((acc, m) => {
      const key = `${m.guessedRaga} → ${m.confirmedRaga}`;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());
  const topConfusions = Array.from(confusions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const recent = matches.slice(0, 20);

  const stats: [string, string][] = [
    ["Hum matches", String(matches.length)],
    ["Verdicts", String(judged.length)],
    ["Accuracy", accuracy != null ? `${Math.round(accuracy * 100)}%` : "—"],
    ["Unique ragas hit", String(new Set(matches.map((m) => m.guessedRaga)).size)],
    ["Judged rate", matches.length > 0 ? `${Math.round((judged.length / matches.length) * 100)}%` : "—"],
    ["Wrong guesses corrected", String(topConfusions.reduce((a, c) => a + c[1], 0))],
  ];

  return (
    <main className="page-wrap max-w-4xl">
      <SiteHeader />

      <h1 className="heading mt-12">Match analytics</h1>
      <p className="subtle mt-2">
        Real accuracy numbers from user verdicts on hum→raga guesses.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-4">
            <dt className="label">{label}</dt>
            <dd className="mt-1 font-display text-2xl text-maroon">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="heading text-xl">Confidence calibration</h2>
        <p className="subtle mt-1">Do higher-confidence guesses actually hit more often?</p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="label px-4 py-3 font-semibold">Confidence</th>
                <th className="label px-4 py-3 font-semibold">Judged</th>
                <th className="label px-4 py-3 font-semibold">Hit rate</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.label} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">{b.label}</td>
                  <td className="px-4 py-2.5 tabular-nums">{b.n}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {b.rate != null ? `${Math.round(b.rate * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="heading text-xl">Where it confuses</h2>
        <p className="subtle mt-1">Guessed raga → the raga the user actually meant.</p>
        {topConfusions.length === 0 ? (
          <p className="subtle mt-4">No corrected misses yet.</p>
        ) : (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label px-4 py-3 font-semibold">Guessed → meant</th>
                  <th className="label px-4 py-3 font-semibold">Count</th>
                </tr>
              </thead>
              <tbody>
                {topConfusions.map(([pair, n]) => (
                  <tr key={pair} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium">{pair}</td>
                    <td className="px-4 py-2.5 tabular-nums">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="heading text-xl">Recent matches</h2>
        {recent.length === 0 ? (
          <p className="subtle mt-4">No matches recorded yet.</p>
        ) : (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label px-4 py-3 font-semibold">Guessed raga</th>
                  <th className="label px-4 py-3 font-semibold">Confidence</th>
                  <th className="label px-4 py-3 font-semibold">Verdict</th>
                  <th className="label px-4 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium">{m.guessedRaga}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {m.confidence != null ? `${Math.round(m.confidence * 100)}%` : "manual"}
                    </td>
                    <td className="px-4 py-2.5">
                      {m.verdict ?? <span className="subtle">—</span>}
                      {m.verdict === "wrong" && m.confirmedRaga
                        ? ` (meant ${m.confirmedRaga})`
                        : ""}
                    </td>
                    <td className="px-4 py-2.5 subtle tabular-nums">
                      {m.createdAt.toISOString().slice(0, 19).replace("T", " ")}
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
