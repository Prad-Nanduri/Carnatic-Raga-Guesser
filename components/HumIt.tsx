"use client";

/**
 * "Hum it" raga suggestion — records a short hum in the browser, detects
 * pitch client-side with Pitchy (MPM autocorrelation on an AnalyserNode),
 * builds a pitch-class histogram normalized to the user's calibrated Sa,
 * and offers the top candidate ragas from our curated list.
 * Raw audio never leaves the browser; only raga + confidence are submitted.
 */

import { useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { pitchClassHistogram, matchRagas, type RagaCandidate } from "@/lib/pitch/matcher";

type Phase = "idle" | "calibrating" | "humming" | "candidates" | "error";

const CALIBRATE_MS = 3000;
const PHRASE_MS = 15000;
const CLARITY = 0.7;

export default function HumIt({
  onPick,
}: {
  onPick: (raga: string, confidence: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [candidates, setCandidates] = useState<RagaCandidate[]>([]);
  const [error, setError] = useState("");
  const stopRef = useRef(false);

  async function run() {
    setError("");
    stopRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("error");
      setError("Microphone access was denied — pick a raga manually instead.");
      return;
    }

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const detector = PitchDetector.forFloat32Array(buf.length);

      const collect = async (ms: number): Promise<number[]> => {
        const freqs: number[] = [];
        const start = performance.now();
        const tick = () =>
          new Promise<void>((r) => requestAnimationFrame(() => r()));
        while (performance.now() - start < ms) {
          if (stopRef.current) break;
          setSecondsLeft(Math.max(0, Math.ceil((ms - (performance.now() - start)) / 1000)));
          analyser.getFloatTimeDomainData(buf);
          const [freq, clarity] = detector.findPitch(buf, ctx.sampleRate);
          if (clarity > CLARITY && freq > 60 && freq < 800) freqs.push(freq);
          await tick();
        }
        return freqs;
      };

      // Step 1: calibration — user holds a comfortable Sa.
      setPhase("calibrating");
      const saFreqs = await collect(CALIBRATE_MS);
      if (saFreqs.length < 10) {
        throw new Error("Couldn't hear a steady Sa — try holding the note longer.");
      }
      saFreqs.sort((a, b) => a - b);
      const sa = saFreqs[Math.floor(saFreqs.length / 2)]; // median

      // Step 2: phrase — up to 15s, user can stop early via button.
      setPhase("humming");
      const phraseFreqs = await collect(PHRASE_MS);
      if (phraseFreqs.length < 20) {
        throw new Error("Not enough pitched audio — hum a longer phrase.");
      }

      const hist = pitchClassHistogram(phraseFreqs, sa);
      const result = matchRagas(hist);
      setCandidates(result);
      setPhase("candidates");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Pitch detection failed.");
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  const stop = () => { stopRef.current = true; };

  if (phase === "candidates") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          Closest matches to your phrase — pick one, or choose a raga manually
          above:
        </p>
        <ul className="flex flex-col gap-2">
          {candidates.map((c, i) => (
            <li key={c.raga}>
              <button
                type="button"
                onClick={() => onPick(c.raga, c.confidence)}
                className={`w-full rounded-md border px-4 py-3 text-left text-sm ${
                  i === 0 ? "border-maroon bg-sand" : "border-line"
                }`}
              >
                <span className="font-medium text-ink">{c.raga}</span>
                <span className="subtle float-right">
                  {Math.round(c.confidence * 100)}% match
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={run} className="btn-ghost self-start">
          Hum again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {phase === "idle" || phase === "error" ? (
        <button type="button" onClick={run} className="btn-ghost self-start">
          Hum it instead
        </button>
      ) : (
        <button type="button" onClick={stop} className="btn-ghost self-start">
          Stop early
        </button>
      )}
      {phase === "calibrating" && (
        <p className="text-sm text-ink-soft">
          Hold a comfortable note as your Sa… ({secondsLeft}s)
        </p>
      )}
      {phase === "humming" && (
        <p className="text-sm text-ink-soft">
          Now hum a phrase in the raga you have in mind… ({secondsLeft}s)
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
