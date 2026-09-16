"use client";

/**
 * Pitch-contour + match-evidence visualization.
 *
 * Left: the user's hummed pitch track (semitones above their Sa, over
 * time) with the candidate raga's swaras drawn as horizontal guide bands.
 * Right: per-swara energy — how much of the hum landed on each pitch
 * class, colored by whether that swara belongs to the raga's scale.
 * This is the "match evidence" view: which swaras you hit, which you
 * missed, and which off-scale notes cost the raga its score.
 */

import { useEffect, useRef } from "react";
import { ragaPitchClasses } from "@/lib/pitch/matcher";

const LABELS = ["S", "R1", "R2/G1", "R3/G2", "G3", "M1", "M2", "P", "D1", "D2/N1", "D3/N2", "N3"];

export default function PitchContour({
  semis,
  hist,
  raga,
}: {
  /** Hum pitch track as semitones above Sa (same order as recording). */
  semis: number[];
  /** 12-bucket pitch-class histogram (same normalization as matcher). */
  hist: number[];
  raga: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || semis.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scale = ragaPitchClasses(raga);
    const yMin = Math.min(...semis, 0) - 1;
    const yMax = Math.max(...semis, 12) + 1;
    const yOf = (s: number) => H - ((s - yMin) / (yMax - yMin)) * H;

    // Background
    ctx.fillStyle = "#faf6ef";
    ctx.fillRect(0, 0, W, H);

    // Swara guide bands for the raga (±0.35 semitone around each scale tone)
    scale.forEach((pc) => {
      for (let oct = -1; oct <= 1; oct++) {
        const c = pc + oct * 12;
        if (c < yMin || c > yMax) continue;
        ctx.fillStyle = "rgba(122, 32, 32, 0.07)";
        ctx.fillRect(0, yOf(c + 0.35), W, yOf(c - 0.35) - yOf(c + 0.35));
        ctx.strokeStyle = "rgba(122, 32, 32, 0.25)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yOf(c));
        ctx.lineTo(W, yOf(c));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Octave lines
    for (const s of [0, 12]) {
      ctx.strokeStyle = "rgba(60, 50, 40, 0.3)";
      ctx.beginPath();
      ctx.moveTo(0, yOf(s));
      ctx.lineTo(W, yOf(s));
      ctx.stroke();
    }

    // Pitch track
    ctx.strokeStyle = "#7a2020";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    semis.forEach((s, i) => {
      const x = (i / Math.max(1, semis.length - 1)) * W;
      const y = yOf(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Swara labels
    ctx.fillStyle = "#5a4a38";
    ctx.font = "10px sans-serif";
    ctx.fillText("S", 4, yOf(0) - 3);
    ctx.fillText("S'", 4, yOf(12) - 3);
  }, [semis, raga]);

  const max = Math.max(...hist, 1);

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        className="w-full rounded-md border border-line"
      />
      <div className="flex items-end gap-1" aria-label="swara energy">
        {hist.map((w, pc) => {
          const inScale = ragaPitchClasses(raga).has(pc);
          const h = Math.max(3, Math.round((w / max) * 48));
          return (
            <div key={pc} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm ${inScale ? "bg-maroon" : "bg-bronze/50"}`}
                style={{ height: h }}
                title={`${LABELS[pc]}: ${w} frames`}
              />
              <span className="text-[9px] text-ink-soft">{LABELS[pc]}</span>
            </div>
          );
        })}
      </div>
      <p className="subtle">
        Your pitch contour vs {raga}&rsquo;s swaras (dashed guides). Bars show
        how much you sang each swara — maroon = in-scale, bronze = off-scale.
      </p>
    </div>
  );
}
