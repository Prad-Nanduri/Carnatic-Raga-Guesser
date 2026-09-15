/**
 * Parse arohana/avarohana scale strings ("S R2 G3 P N3 S") into semitone
 * offsets relative to Sa. Reuses the swara→semitone map shared with the
 * pitch matcher; octave anchors S at 0, S' at 12, lower S at -12.
 */

const SWARA_TO_SEMITONE: Record<string, number> = {
  S: 0, R1: 1, R2: 2, R3: 3,
  G1: 2, G2: 3, G3: 4,
  M1: 5, M2: 6, P: 7,
  D1: 8, D2: 9, D3: 10,
  N1: 9, N2: 10, N3: 11,
};

export interface ParsedScale {
  /** Ascending semitone path, normalized to [0..12]. */
  arohana: number[];
  /** Descending semitone path, normalized to [12..0]. */
  avarohana: number[];
  /** Union set of allowed semitone classes (mod 12) for free wandering. */
  swaraSet: Set<number>;
}

export function parseScale(arohana: string, avarohana: string): ParsedScale {
  const toSemis = (scale: string): number[] =>
    scale
      .trim()
      .split(/\s+/)
      .map((tok) => SWARA_TO_SEMITONE[tok.toUpperCase()])
      .filter((n): n is number => n !== undefined);

  let aro = toSemis(arohana);
  let ava = toSemis(avarohana);

  // Ensure the ascent starts on Sa and ends on S' (12); descent the reverse.
  if (aro.length === 0) aro = [0, 12];
  if (aro[0] !== 0) aro.unshift(0);
  if (aro[aro.length - 1] !== 12) aro.push(12);
  if (ava.length === 0) ava = [12, 0];
  if (ava[0] !== 12) ava.unshift(12);
  if (ava[ava.length - 1] !== 0) ava.push(0);

  const swaraSet = new Set<number>();
  for (const s of [...aro, ...ava]) swaraSet.add(((s % 12) + 12) % 12);

  return { arohana: aro, avarohana: ava, swaraSet };
}
