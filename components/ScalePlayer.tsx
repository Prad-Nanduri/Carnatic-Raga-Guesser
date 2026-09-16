"use client";

/**
 * Scale player — plays a raga's arohana (ascent) + avarohana (descent)
 * entirely client-side with the Web Audio API. Voice is a soft, slightly
 * detuned two-oscillator tone with a slow vibrato (flute-ish) over a
 * quiet Sa drone — simple is fine for scale audiation.
 */

import { useRef, useState } from "react";
import { RAGA_DATA } from "@/lib/raga-engine/select";

const NOTE_SEMITONE: Record<string, number> = {
  S: 0, R1: 1, R2: 2, R3: 3,
  G1: 2, G2: 3, G3: 4,
  M1: 5, M2: 6, P: 7,
  D1: 8, D2: 9, D3: 10,
  N1: 9, N2: 10, N3: 11,
};

const SA_HZ = 196; // G3

function semisOf(scale: string): number[] {
  return scale
    .split(/\s+/)
    .map((t) => NOTE_SEMITONE[t.toUpperCase()])
    .filter((n): n is number => n !== undefined);
}

export default function ScalePlayer({ raga }: { raga: string }) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const stop = () => {
    for (const n of nodesRef.current) {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      n.disconnect();
    }
    nodesRef.current = [];
    setPlaying(false);
  };

  const play = async () => {
    stop();
    const theory = RAGA_DATA[raga];
    if (!theory) return;
    const aro = semisOf(theory.arohana);
    const ava = semisOf(theory.avarohana);
    const seq = [...aro, ...ava.slice(1)]; // aro then avarohana without repeating top Sa

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    setPlaying(true);

    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    nodesRef.current.push(master);

    // Sa drone: soft, constant.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.06;
    droneGain.connect(master);
    const d1 = ctx.createOscillator();
    d1.frequency.value = SA_HZ / 2;
    d1.type = "triangle";
    const d2 = ctx.createOscillator();
    d2.frequency.value = SA_HZ;
    d2.type = "sine";
    d1.connect(droneGain); d2.connect(droneGain);
    d1.start(); d2.start();
    nodesRef.current.push(d1, d2, droneGain);

    // Melody: each swara 650ms with gentle attack/release + slow vibrato.
    const NOTE = 0.65;
    let t = ctx.currentTime + 0.25;
    for (const semi of seq) {
      const f = SA_HZ * Math.pow(2, semi / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.07);
      g.gain.setValueAtTime(0.5, t + NOTE - 0.12);
      g.gain.linearRampToValueAtTime(0, t + NOTE);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      g.connect(lp).connect(master);

      const o1 = ctx.createOscillator();
      o1.type = "sine"; o1.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = "triangle"; o2.frequency.value = f; o2.detune.value = 6;
      const o2g = ctx.createGain(); o2g.gain.value = 0.35;
      const vib = ctx.createOscillator();
      vib.frequency.value = 5;
      const vibG = ctx.createGain(); vibG.gain.value = f * 0.008;
      vib.connect(vibG).connect(o2.frequency);

      o1.connect(g); o2.connect(o2g).connect(g);
      o1.start(t); o1.stop(t + NOTE);
      o2.start(t); o2.stop(t + NOTE);
      vib.start(t); vib.stop(t + NOTE);
      nodesRef.current.push(o1, o2, vib, g, lp, o2g, vibG);
      t += NOTE;
    }

    // Auto-stop when the sequence ends.
    setTimeout(() => setPlaying(false), (t - ctx.currentTime) * 1000 + 400);
    const total = t - ctx.currentTime;
    setTimeout(() => {
      for (const n of nodesRef.current) {
        try { (n as OscillatorNode).stop?.(); } catch { /* noop */ }
      }
    }, total * 1000 + 600);
  };

  return (
    <button type="button" onClick={playing ? stop : play} className="btn-ghost">
      {playing ? "Stop" : `Play scale — ${raga}`}
    </button>
  );
}
