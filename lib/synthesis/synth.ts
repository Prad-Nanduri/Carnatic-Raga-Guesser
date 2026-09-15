/**
 * Alapana renderer — physically-modelled instruments, continuous pitch.
 *
 * Plucked voices (veena, sitar) use Karplus-Strong string synthesis driven
 * by a per-sample pitch path, which produces a real plucked-string timbre
 * instead of a static additive stack. Sustained voices use a source-filter
 * model: a harmonically shaped excitation (saw/pulse for bowed & reeds,
 * sine+noise for the flute) run through per-instrument resonant filters,
 * with delayed vibrato. Jaru slides ease out (fast into the note, settling
 * on arrival); kampita oscillates toward the adjacent swara rather than a
 * generic ±depth warble.
 *
 * Output: Float32Array mono @ 44.1kHz.
 */

import { MelodyNote } from "./melody";
import { ParsedScale } from "./scales";

export const SAMPLE_RATE = 44_100;
const TONIC_HZ = 196; // Sa = G3

const semiToHz = (s: number) => TONIC_HZ * Math.pow(2, s / 12);

/** Smooth (cubic smoothstep) slide from prev to current over slideSec. */
function slideSemi(note: MelodyNote, tLocal: number): number {
  if (note.slideFrom === undefined || note.slideFrom === note.semi)
    return note.semi;
  const slideDur = Math.min(0.5, Math.max(0.15, note.dur * 0.35));
  if (tLocal >= slideDur) return note.semi;
  const k = tLocal / slideDur;
  // Exponential-ish arrival: moves fast off the origin, settles on target.
  const eased = 1 - Math.pow(1 - k, 2.5);
  return note.slideFrom + (note.semi - note.slideFrom) * eased;
}

/** Kampita: oscillate toward the adjacent swara below (typical gamaka). */
function kampitaOffset(
  note: MelodyNote,
  scale: ParsedScale | null,
  tLocal: number,
  attack: number,
): number {
  if (note.ornament !== "kampita" || tLocal < attack + 0.15) return 0;
  // Oscillate toward the lower neighbor by ~40-70% of the interval to the
  // next scale step (falls back to half a semitone if unknown).
  let depth = 0.4;
  if (scale) {
    const lower = [...scale.avarohana].reverse().find((s) => s < note.semi);
    if (lower !== undefined) depth = Math.min(0.8, (note.semi - lower) * 0.55);
  }
  const rate = 4.2 + Math.sin(note.t * 13.7) * 0.4;
  const t = tLocal - attack - 0.15;
  const onset = Math.min(1, t / 0.25); // ease the oscillation in
  return -depth * onset * (0.5 - 0.5 * Math.cos(2 * Math.PI * rate * t));
}

function vibrato(tLocal: number, depth: number, attack: number): number {
  if (depth <= 0 || tLocal < attack + 0.3) return 0;
  const t = tLocal - attack - 0.3;
  const onset = Math.min(1, t / 0.4);
  return depth * onset * Math.sin(2 * Math.PI * 5.4 * t);
}

/* ---------- one-pole resonant lowpass (formant) filter ---------- */
class Resonator {
  private y1 = 0;
  private readonly a: number;
  private readonly b0: number;
  /** centerHz + Q controls: a = exp(-bw*2π/sr), b0 = 1-a scaled by Q. */
  constructor(centerHz: number, bandwidthHz: number, gain = 1) {
    this.a = Math.exp((-Math.PI * bandwidthHz) / SAMPLE_RATE);
    const w = (2 * Math.PI * centerHz) / SAMPLE_RATE;
    this.b0 = gain * (1 - this.a);
    this.w = w;
  }
  private w: number;
  private cosw = 0;
  step(x: number): number {
    if (this.cosw === 0) this.cosw = Math.cos(this.w);
    const y =
      this.b0 * x + 2 * this.a * this.cosw * this.y1 - this.a * this.a * (this.y2 ?? 0);
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
  private y2 = 0;
}

interface VoiceDef {
  kind: "pluck" | "sustain";
  /** sustain: excitation shape. */
  excite?: "saw" | "pulse" | "sine+noise";
  /** sustain: formant resonators [centerHz, bandwidthHz, gain]. */
  formants?: [number, number, number][];
  /** sustain: extra excitation lowpass cutoff (harmonic damping). */
  bright?: number;
  vibrato: number; // semitone depth on sustains
  attack: number;
  release: number;
  /** pluck: KS damping factor (0.99x — higher = longer sustain). */
  damp?: number;
  /** pluck: blend amount of a second slightly-detuned sympathetic string. */
  symp?: number;
}

const VOICES: Record<string, VoiceDef> = {
  // Warm bowed: sawtooth through two mid formants, slow vibrato.
  violin: {
    kind: "sustain", excite: "saw", vibrato: 0.08, attack: 0.08, release: 0.25,
    formants: [[900, 400, 1], [2200, 600, 0.5], [3400, 900, 0.25]],
  },
  // Saraswati veena: KS plucked string + sympathetic shimmer.
  veena: { kind: "pluck", vibrato: 0, attack: 0.004, release: 0.5, damp: 0.996, symp: 0.25 },
  // Bamboo venu: sine-dominant with breath noise, soft formant.
  venu_flute: {
    kind: "sustain", excite: "sine+noise", vibrato: 0.06, attack: 0.12, release: 0.25,
    formants: [[700, 500, 1]],
  },
  // Nadaswaram: hard reed — narrow pulse, strong bright formants.
  nadaswaram: {
    kind: "sustain", excite: "pulse", vibrato: 0.05, attack: 0.025, release: 0.18,
    formants: [[1200, 300, 1], [2400, 400, 0.7], [3600, 700, 0.4]],
  },
  // Kadri-style saxophone: pulse-ish reed, darker formants.
  saxophone: {
    kind: "sustain", excite: "pulse", vibrato: 0.1, attack: 0.05, release: 0.22,
    formants: [[800, 400, 1], [1700, 500, 0.6], [2800, 800, 0.3]],
  },
  // Voice approximation: saw through vowel-ish formants, strong vibrato.
  voice: {
    kind: "sustain", excite: "saw", vibrato: 0.14, attack: 0.1, release: 0.2,
    formants: [[750, 200, 1], [1150, 250, 0.8], [2900, 400, 0.35]],
  },
  // Sitar: KS pluck, brighter/longer ring + jawari-like sympathetic.
  sitar_fusion: { kind: "pluck", vibrato: 0, attack: 0.003, release: 0.45, damp: 0.998, symp: 0.45 },
};

const voiceFor = (i: string): VoiceDef => VOICES[i] ?? VOICES.violin;

/** Deterministic noise for pluck excitation. */
function noiseSample(seed: number): number {
  // cheap xorshift-style
  let x = seed | 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

/** Karplus-Strong plucked string at a per-sample pitch path. */
function renderPluck(
  note: MelodyNote,
  v: VoiceDef,
  scale: ParsedScale | null,
  out: Float32Array,
): void {
  // Ring buffer sized for the lowest reachable delay (M = sr/f).
  const N = 2048;
  const buf = new Float32Array(N);
  let wIdx = 0;

  const start = Math.floor(note.t * SAMPLE_RATE);
  const end = Math.min(Math.floor((note.t + note.dur + v.release) * SAMPLE_RATE), out.length);
  const damp = v.damp ?? 0.996;

  // Sympathetic string at +7 semitones, quieter.
  const buf2 = new Float32Array(N);
  let w2 = 0;
  const symp = v.symp ?? 0;

  for (let i = start; i < end; i++) {
    const tLocal = i / SAMPLE_RATE - note.t;
    const semi = slideSemi(note, tLocal) + kampitaOffset(note, scale, tLocal, v.attack);
    const f = semiToHz(semi);
    const f2 = semiToHz(semi + 7);
    // Delay = one period at the *current* pitch (tracks slides).
    const M = Math.min(N - 2, Math.max(2, Math.round(SAMPLE_RATE / f)));
    const M2 = Math.min(N - 2, Math.max(2, Math.round(SAMPLE_RATE / f2)));

    // Pluck excitation: noise for the first ~2 periods.
    const excWin = 2.2 / f;
    const exc = tLocal < excWin ? noiseSample(i * 7 + 13) * (1 - tLocal / excWin) : 0;
    const exc2 = tLocal < excWin ? noiseSample(i * 5 + 7) * symp * (1 - tLocal / excWin) : 0;

    const rA = (wIdx + N - M) % N;
    const rB = (wIdx + N - M - 1) % N;
    buf[wIdx] = exc + damp * 0.5 * (buf[rA] + buf[rB]);
    const s = buf[wIdx];
    wIdx = (wIdx + 1) % N;

    let s2 = 0;
    if (symp > 0) {
      const rA2 = (w2 + N - M2) % N;
      const rB2 = (w2 + N - M2 - 1) % N;
      buf2[w2] = exc2 + Math.min(0.9995, damp * 1.002) * 0.5 * (buf2[rA2] + buf2[rB2]);
      s2 = buf2[w2];
      w2 = (w2 + 1) % N;
    }

    // Envelope: fast attack, release tail at note end.
    const tLeft = note.dur - tLocal;
    let env = tLocal < v.attack ? tLocal / v.attack : 1;
    if (tLeft < v.release) env *= Math.max(0, tLeft / v.release);

    out[i] += (s + s2 * 0.7) * env * note.amp * 0.7;
  }
}

/** Source-filter sustained voice (bowed / reed / flute / voice approx). */
function renderSustain(
  note: MelodyNote,
  v: VoiceDef,
  scale: ParsedScale | null,
  out: Float32Array,
): void {
  const resonators = (v.formants ?? [[800, 400, 1]]).map(
    ([c, b, g]) => new Resonator(c, b, g),
  );

  const start = Math.floor(note.t * SAMPLE_RATE);
  const end = Math.min(Math.floor((note.t + note.dur + v.release) * SAMPLE_RATE), out.length);
  let phase = 0;
  let lp = 0; // one-pole lowpass state for extra damping

  for (let i = start; i < end; i++) {
    const tLocal = i / SAMPLE_RATE - note.t;
    const semi =
      slideSemi(note, tLocal) +
      kampitaOffset(note, scale, tLocal, v.attack) +
      vibrato(tLocal, v.vibrato, v.attack);
    const f = semiToHz(semi);
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    if (phase > Math.PI * 64) phase %= 2 * Math.PI;

    // Excitation.
    const p = phase % (2 * Math.PI);
    let exc: number;
    if (v.excite === "saw") {
      exc = (p / Math.PI) - 1;
    } else if (v.excite === "pulse") {
      exc = p < Math.PI * 0.25 ? 1 : -0.35;
    } else {
      // sine + breath noise
      exc = Math.sin(p) + noiseSample(i * 11 + 3) * 0.06;
    }

    // Mild lowpass on the raw excitation (bow/rosin smoothing).
    const lpCoef = 0.4;
    lp += lpCoef * (exc - lp);

    // Run through the formant resonators.
    let s = 0;
    for (const r of resonators) s += r.step(lp);

    // Envelope: attack ramp, sustain, release tail.
    const tLeft = note.dur - tLocal;
    let env: number;
    if (tLocal < v.attack) env = tLocal / v.attack;
    else if (tLeft < v.release) env = Math.max(0, tLeft / v.release);
    else env = 1;

    out[i] += s * env * note.amp * 0.4;
  }
}

export function renderMelody(
  notes: MelodyNote[],
  instrument: string,
  duration: number,
  out: Float32Array,
  scale: ParsedScale | null = null,
): void {
  const v = voiceFor(instrument);
  for (const note of notes) {
    if (v.kind === "pluck") renderPluck(note, v, scale, out);
    else renderSustain(note, v, scale, out);
  }
}

/**
 * Tanpura drone: KS plucks — Pa, S', S', S in the mandra register, long
 * decay, quiet bed.
 */
export function renderDrone(duration: number, out: Float32Array): void {
  const cycleSemis = [7, 12, 12, 0];
  const cycleLen = 4.2;
  for (let startT = 0, idx = 0; startT < duration; startT += cycleLen, idx++) {
    const semi = cycleSemis[idx % cycleSemis.length] - 12;
    const fake: MelodyNote = {
      t: startT, dur: cycleLen * 1.15, semi, amp: 0.55,
      ornament: "none", restAfter: 0,
    };
    renderPluck(fake, { kind: "pluck", vibrato: 0, attack: 0.004, release: cycleLen, damp: 0.9975 }, null, out);
  }
}

/** Render melody + drone, normalize, fades. */
export function renderAlapana(
  notes: MelodyNote[],
  instrument: string,
  duration: number,
  scale: ParsedScale | null = null,
): Float32Array {
  const total = Math.floor(duration * SAMPLE_RATE);
  const pcm = new Float32Array(total);
  renderDrone(duration, pcm);
  renderMelody(notes, instrument, duration, pcm, scale);

  // Gentle saturation instead of hard clip, then normalize to ~0.85.
  for (let i = 0; i < total; i++) pcm[i] = Math.tanh(pcm[i] * 1.4);
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const fadeIn = Math.floor(0.4 * SAMPLE_RATE);
  const fadeOut = Math.floor(0.9 * SAMPLE_RATE);
  for (let i = 0; i < total; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > total - fadeOut) g *= (total - i) / fadeOut;
    pcm[i] = Math.max(-1, Math.min(1, pcm[i] * g));
  }
  return pcm;
}
