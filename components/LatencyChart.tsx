"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Point {
  name: string;
  ms: number | null;
  status: string;
}

function themeColor(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export default function LatencyChart({ data }: { data: Point[] }) {
  const complete = themeColor("--maroon", "#571d1d");
  const failed = themeColor("--danger", "#8c2b22");
  const tick = themeColor("--ink-soft", "#6f5643");
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: tick }} />
        <YAxis tick={{ fontSize: 11, fill: tick }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}s`} />
        <Tooltip formatter={(v) => [`${v} ms`, "duration"]} />
        <Bar dataKey="ms">
          {data.map((d, i) => (
            <Cell key={i} fill={d.status === "complete" ? complete : failed} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
