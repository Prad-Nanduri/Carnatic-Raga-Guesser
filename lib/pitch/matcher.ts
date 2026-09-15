/**
 * Voice-sample raga suggestion — plain TypeScript, no ML.
 *
 * Compares a tonic-normalized pitch-class histogram (from a hummed phrase,
 * Sa established in a calibration step) against each raga's arohana +
 * avarohana scale profile in `RAGA_DATA`. Restricted to this project's
 * curated raga list and always returned as ranked candidates with scores —
 * never a single confident answer.
 */

import { RAGA_DATA } from "@/lib/raga-engine/select";

/** Standard school notation -> semitones above Sa. */
const NOTE_SEMITONE: Record<string, number> = {
  S: 0,
  R1: 1, R2: 2, R3: 3,
  G1: 2, G2: 3, G3: 4,
  M1: 5, M2: 6,
  P: 7,
  D1: 8, D2: 9, D3: 10,
  N1: 9, N2: 10, N3: 11,
};

/** Parse "S R2 G3 P N3 S" -> Set of semitone classes. */
function scaleSemitones(scale: string): Set<number> {
  const out = new Set<number>();
  for (const tok of scale.split(/\s+/)) {
    if (NOTE_SEMITONE[tok] != null) out.add(NOTE_SEMITONE[tok]);
  }
  return out;
}

/** Union of arohana + avarohana notes for a raga. */
export function ragaPitchClasses(raga: string): Set<number> {
  const t = RAGA_DATA[raga];
  if (!t) return new Set();
  const s = scaleSemitones(t.arohana);
  scaleSemitones(t.avarohana).forEach((n) => s.add(n));
  return s;
}

export interface RagaCandidate {
  raga: string;
  /** 0..1 weighted match of the user's histogram against the raga's scale. */
  confidence: number;
}

/**
 * Score a pitch-class histogram (12 buckets, normalized against the user's
 * calibrated Sa) against every curated raga. Score = fraction of voiced
 * energy landing on scale tones, lightly penalized by energy on non-scale
 * tones; normalized to 0..1. Returns top candidates, highest first.
 */
export function matchRagas(histogram: number[]): RagaCandidate[] {
  const total = histogram.reduce((a, b) => a + b, 0);
  const candidates: RagaCandidate[] = Object.keys(RAGA_DATA).map((raga) => {
    const scale = ragaPitchClasses(raga);
    let onScale = 0;
    let offScale = 0;
    histogram.forEach((w, pc) => {
      if (scale.has(pc)) onScale += w;
      else offScale += w;
    });
    // Covering score minus a small penalty for stray (avivadi) energy.
    const score =
      total > 0 ? Math.max(0, onScale / total - 0.5 * (offScale / total)) : 0;
    return { raga, confidence: Math.round(score * 100) / 100 };
  });
  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Build a 12-bucket pitch-class histogram from detected frequencies,
 * normalizing against the calibrated Sa frequency so the user's own tonic
 * is pitch class 0.
 */
export function pitchClassHistogram(
  freqs: number[],
  saFreq: number,
): number[] {
  const hist = new Array(12).fill(0);
  for (const f of freqs) {
    if (f <= 0 || saFreq <= 0) continue;
    const semis = 12 * Math.log2(f / saFreq);
    const pc = ((Math.round(semis) % 12) + 12) % 12;
    hist[pc] += 1;
  }
  return hist;
}
