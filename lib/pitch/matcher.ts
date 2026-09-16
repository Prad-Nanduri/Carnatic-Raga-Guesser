/**
 * Voice-sample raga suggestion — plain TypeScript, no ML.
 *
 * Scoring: IDF-weighted swara coverage. Each raga is scored by how much
 * of the hum's voiced energy lands on its scale tones, weighted by how
 * *discriminative* each swara is across the catalog (a swara rare among
 * ragas — like prati-madhyama M2 — counts for more than near-universal
 * Sa/Pa). Off-scale energy is penalized the same way. Confidence is the
 * best possible score normalized against the maximum achievable.
 *
 * Restricted to this project's curated raga list and always returned as
 * ranked candidates with scores — never a single confident answer.
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

/**
 * Inverse document frequency per pitch class across the catalog —
 * idf(pc) = ln(N / df(pc)). Swaras appearing in nearly every raga (S, P)
 * get weight ~0; rare ones get up to ln(N). Precomputed once.
 */
const IDF: number[] = (() => {
  const ragas = Object.keys(RAGA_DATA);
  const N = ragas.length;
  const df = new Array(12).fill(0);
  for (const r of ragas) {
    ragaPitchClasses(r).forEach((pc) => df[pc]++);
  }
  return df.map((d) => Math.log(N / Math.max(1, d)));
})();

/** Pitch classes present in more than ~90% of ragas get a floor weight
 *  instead of ~0, so Sa/Pa still contribute a little. */
const IDF_FLOOR = 0.05;

export interface RagaCandidate {
  raga: string;
  /** 0..1 weighted match of the user's histogram against the raga's scale. */
  confidence: number;
}

const w = (pc: number) => Math.max(IDF[pc], IDF_FLOOR);

/**
 * Score a pitch-class histogram (12 buckets, normalized against the
 * user's calibrated Sa) against every curated raga. Returns top
 * candidates, highest first.
 */
export function matchRagas(histogram: number[]): RagaCandidate[] {
  // Noise floor: ignore bins holding less than 8% of the peak — stray
  // frames from breath, consonants, and detection jitter.
  const peak = Math.max(...histogram);
  const filtered = histogram.map((h) => (peak > 0 && h < peak * 0.08 ? 0 : h));
  const totalWeight = filtered.reduce((a, h, pc) => a + h * w(pc), 0);

  const candidates: RagaCandidate[] = Object.keys(RAGA_DATA).map((raga) => {
    const scale = ragaPitchClasses(raga);
    let onScale = 0;
    let offScale = 0;
    filtered.forEach((h, pc) => {
      const e = h * w(pc);
      if (scale.has(pc)) onScale += e;
      else offScale += e;
    });
    const score =
      totalWeight > 0
        ? Math.max(0, onScale / totalWeight - 0.5 * (offScale / totalWeight))
        : 0;
    return { raga, confidence: Math.round(score * 100) / 100 };
  });
  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Build a 12-bucket pitch-class histogram from detected frequencies,
 * normalizing against the calibrated Sa frequency so the user's own
 * tonic is pitch class 0. Each frame's duration is the count weight —
 * longer-held swaras naturally weigh more.
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
