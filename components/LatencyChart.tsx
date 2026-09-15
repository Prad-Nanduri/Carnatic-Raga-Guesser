"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Point {
  name: string;
  ms: number | null;
  status: string;
}

export default function LatencyChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}s`} />
        <Tooltip formatter={(v) => [`${v} ms`, "duration"]} />
        <Bar dataKey="ms">
          {data.map((d, i) => (
            <Cell key={i} fill={d.status === "complete" ? "#111111" : "#cc3333"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
