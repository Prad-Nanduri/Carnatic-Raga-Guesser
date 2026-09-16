"use client";

/**
 * "Hum" raga suggestion — records a short phrase in the browser, detects
 * pitch client-side with Pitchy (MPM autocorrelation on an AnalyserNode),
 * builds a pitch-class histogram normalized to the user's calibrated Sa,
 * and offers the top candidate ragas from our curated list.
 * Raw audio never leaves the browser; only raga + confidence are submitted.
 */

import { useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { MicrophoneIcon, StopIcon } from "@phosphor-icons/react";
import { pitchClassHistogram, matchRagas, type RagaCandidate } from "@/lib/pitch/matcher";

type Phase = "idle" | "calibrating" | "humming" | "candidates" | "error";

const CALIBRATE_MS = 3000;
const PHRASE_MS = 15000;
const CLARITY = 0.7;

export interface HumResult {
  raga: string;
  confidence: number;
  /** pitch track in semitones above the calibrated Sa */
  semis: number[];
  /** 12-bucket pitch-class histogram (0 = Sa) */
  hist: number[];
}

export default function HumIt({
  onPick,
}: {
  onPick: (result: HumResult) => void;
}) {
  const trackRef = useRef<{ semis: number[]; hist: number[] } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(0);
  const [candidates, setCandidates] = useState<RagaCandidate[]>([]);
  const [error, setError] = useState("");
  const stopRef = useRef(false);
  const levelAtRef = useRef(0);

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
          const elapsed = performance.now() - start;
          setProgress(Math.min(1, elapsed / ms));
          analyser.getFloatTimeDomainData(buf);
          // RMS level for the live meter (throttled to ~12fps of renders).
          let rms = 0;
          for (let i = 0; i < buf.length; i += 16) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / (buf.length / 16));
          if (elapsed - levelAtRef.current > 80) {
            levelAtRef.current = elapsed;
            setLevel(Math.min(1, rms * 6));
          }
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
      const semis = phraseFreqs.map((f) => 12 * Math.log2(f / sa));
      trackRef.current = { semis, hist };
      const result = matchRagas(hist);
      setCandidates(result);
      setPhase("candidates");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Pitch detection failed.");
    } finally {
      stream.getTracks().forEach((t) => t.stop());
      setLevel(0);
    }
  }

  const stop = () => { stopRef.current = true; };
  const recording = phase === "calibrating" || phase === "humming";

  if (phase === "candidates") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          Closest matches to your phrase — pick one, or browse manually:
        </p>
        <ul className="flex flex-col gap-2">
          {candidates.map((c, i) => (
            <li key={c.raga}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    raga: c.raga,
                    confidence: c.confidence,
                    semis: trackRef.current?.semis ?? [],
                    hist: trackRef.current?.hist ?? [],
                  })
                }
                className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-all hover:-translate-y-px hover:border-bronze active:translate-y-0 active:scale-[0.99] ${
                  i === 0 ? "border-maroon bg-sand" : "border-line bg-card"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="mr-2 text-xs text-bronze">#{i + 1}</span>
                    <span className="font-medium text-ink">{c.raga}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="meter" aria-hidden="true">
                      <span style={{ width: `${Math.round(c.confidence * 100)}%` }} />
                    </span>
                    <span className="subtle tabular-nums">
                      {Math.round(c.confidence * 100)}%
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={run} className="btn-ghost self-start">
          Record again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!recording && (
        <>
          <button
            type="button"
            onClick={run}
            className="btn-record group"
            aria-label="Start recording"
          >
            <span className="btn-record__dot" aria-hidden="true">
              <MicrophoneIcon weight="fill" className="h-5 w-5" />
            </span>
            Record
          </button>
          <p className="subtle max-w-md text-xs leading-relaxed">
            Audio never leaves your browser. Matching a real voice to a raga is a
            best-effort guess against Ragaforge&rsquo;s curated catalog —
            treat the candidates as suggestions and confirm the one that sounds right.
          </p>
        </>
      )}

      {recording && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="rec-dot" aria-hidden="true" />
            <p className="text-sm text-ink-soft">
              {phase === "calibrating"
                ? "Hold a comfortable note as your Sa…"
                : "Now hum a phrase in the raga you have in mind…"}
            </p>
            <button type="button" onClick={stop} className="btn-ghost ml-auto !min-h-9 px-3 py-1">
              <StopIcon weight="fill" className="mr-1.5 inline h-4 w-4" />
              Stop
            </button>
          </div>
          {/* progress + live level */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-maroon transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex h-6 items-end gap-1" aria-hidden="true">
            {[0.2, 0.5, 0.8, 1, 0.8, 0.5, 0.2].map((k, i) => (
              <span
                key={i}
                className="w-1.5 rounded-sm bg-bronze/70 transition-[height] duration-100"
                style={{ height: `${Math.max(10, level * k * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
