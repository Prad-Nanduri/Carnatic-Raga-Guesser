/**
 * Alapana melody generator: builds a free-rhythm sequence of notes that
 * obeys the raga's arohana/avarohana grammar — ascending motion follows
 * the arohana path, descending motion the avarohana path — with sectional
 * structure modelled on a real alapana (start on/around Sa, rise through
 * the middle register, peak near tara Sa, resolve home).
 *
 * Ornaments are first-class: sustained notes can carry kampita (a gamaka
 * oscillation), and transitions carry jaru (slides) — rendered downstream
 * by the pitch-contour synthesizer, which is continuous-pitch, not
 * note-triggered.
 */

import { ParsedScale } from "./scales";

export type Ornament = "none" | "kampita" | "jaru";

export interface MelodyNote {
  /** Start time in seconds. */
  t: number;
  /** Duration in seconds. */
  dur: number;
  /** Pitch in semitones above Sa (can exceed 12 or go negative). */
  semi: number;
  /** Amplitude 0..1. */
  amp: number;
  /** Ornament applied across the sustain portion. */
  ornament: Ornament;
  /** For "jaru": semitone to slide from at note onset. */
  slideFrom?: number;
  /** Whether a short breath/pause follows this note. */
  restAfter: number;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** Move one scale-step from `semi` in direction `dir` (+1 asc, -1 desc). */
function stepFrom(scale: ParsedScale, semi: number, dir: 1 | -1): number {
  const path = dir === 1 ? scale.arohana : scale.avarohana;
  const [lo, hi] = dir === 1 ? [semi, semi + 12] : [semi - 12, semi];
  const candidates = path.filter((s) => s > lo && s <= hi);
  if (dir === 1) {
    const next = candidates.find((s) => s > semi);
    if (next !== undefined) return next;
    return semi + 12; // wrap to upper Sa
  }
  const prev = [...candidates].reverse().find((s) => s < semi);
  if (prev !== undefined) return prev;
  return semi - 12;
}

/** Nearest legal semitone (mod-12 class in swaraSet) at-or-near `semi`. */
function snapToScale(scale: ParsedScale, semi: number): number {
  for (let off = 0; off <= 3; off++) {
    if (scale.swaraSet.has(((semi + off) % 12 + 12) % 12)) return semi + off;
    if (scale.swaraSet.has(((semi - off) % 12 + 12) % 12)) return semi - off;
  }
  return semi;
}

/**
 * Generate the alapana melody. `duration` is total seconds; melody uses
 * ~85% of it (drone tail + fade reserve).
 */
export function generateAlapana(scale: ParsedScale, duration: number): MelodyNote[] {
  const notes: MelodyNote[] = [];
  const budget = duration * 0.85;

  // Three sections: mandra (low, near Sa), madhya (middle), tara (peak).
  // Section boundaries measured in generated-note "progress" fractions.
  const sections = [
    { until: 0.3, lo: -5, hi: 7, durLo: 1.2, durHi: 2.6 }, // slow, low
    { until: 0.75, lo: -2, hi: 12, durLo: 0.7, durHi: 2.0 }, // expanding
    { until: 1.0, lo: 5, hi: 17, durLo: 0.4, durHi: 1.4 }, // peak, brisker
  ];

  let t = 0.4; // let the drone speak first
  let cur = 0; // start on Sa
  let ascending = true;
  const firstNote = (semi: number, dur: number, ornament: Ornament, slideFrom?: number): MelodyNote => {
    const n: MelodyNote = { t, dur, semi, amp: rand(0.55, 0.85), ornament, slideFrom, restAfter: 0 };
    return n;
  };

  while (t < budget) {
    const progress = t / budget;
    const sec = progress < sections[0].until ? sections[0] : progress < sections[1].until ? sections[1] : sections[2];

    // Choose motion: mostly scale-steps, occasional leaps of 2 steps or a
    // register jump constrained to legal swaras.
    let next: number;
    const roll = Math.random();
    if (roll < 0.72) {
      next = stepFrom(scale, cur, ascending ? 1 : -1);
    } else if (roll < 0.88) {
      next = stepFrom(scale, stepFrom(scale, cur, ascending ? 1 : -1), ascending ? 1 : -1);
    } else {
      // Leap: land on a consonant swara (Sa-family or Pa) within section.
      const anchors = [0, 7, 12, -5, -12].filter((s) => s >= sec.lo - 2 && s <= sec.hi + 2 && s !== cur);
      next = anchors.length ? pick(anchors) : stepFrom(scale, cur, ascending ? 1 : -1);
    }
    next = snapToScale(scale, next);
    next = Math.min(sec.hi, Math.max(sec.lo, next));

    // Direction flips stochastically, biased by section position.
    if (Math.random() < (ascending ? 0.3 : 0.5)) ascending = !ascending;

    const dur = rand(sec.durLo, sec.durHi);
    const isLong = dur > sec.durHi * 0.75;
    // Long sustains get kampita; upward motion often enters by jaru slide.
    let ornament: Ornament = "none";
    let slideFrom: number | undefined;
    if (isLong && Math.random() < 0.7) ornament = "kampita";
    if (next !== cur && Math.random() < 0.45) {
      ornament = ornament === "kampita" ? ornament : "jaru";
      slideFrom = cur;
    }

    const note = firstNote(next, dur, ornament, slideFrom);
    // Phrase-level rests: longer after descents landing on Sa/Pa.
    if (next === 0 || next === 7 || next === 12) note.restAfter = rand(0.25, 0.9);
    else if (Math.random() < 0.12) note.restAfter = rand(0.15, 0.4);

    notes.push(note);
    t += dur + note.restAfter;
    cur = next;
  }

  // Cadence: descend to Sa and hold it long (alapana resolves home).
  const last = notes[notes.length - 1];
  const finalT = last.t + last.dur + last.restAfter + 0.3;
  notes.push({ t: finalT, dur: Math.max(1.8, duration - finalT - 0.4), semi: 0, amp: 0.7, ornament: "kampita", slideFrom: cur === 0 ? undefined : cur, restAfter: 0 });
  return notes;
}
