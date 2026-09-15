"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

function fmt(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WaveformPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#a8a8a8",
      progressColor: "#111111",
      height: 64,
      url: src,
    });
    wsRef.current = ws;
    ws.on("ready", () => setDuration(ws.getDuration()));
    ws.on("timeupdate", (t) => setTime(t));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));
    ws.on("error", () => setError(true));
    return () => ws.destroy();
  }, [src]);

  if (error) {
    return <audio controls src={src} className="w-full" />;
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
      <div className="mt-1 flex items-center gap-3 text-sm">
        <button
          onClick={() => wsRef.current?.playPause()}
          className="rounded border px-3 py-1"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="text-gray-600">
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
