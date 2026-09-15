/**
 * Alapana renderer: continuous-pitch additive synthesis.
 *
 * The melodic voice is monophonic with a *continuous* pitch path — jaru
 * slides ramp in semitone space and kampita is a slow oscillation layered
 * onto sustained notes — which is what keeps this from sounding like
 * triggered MIDI notes. Each instrument is a partial-weight table plus an
 * envelope shape (plucked vs. sustained).
 *
 * Output: Float32Array mono @ 44.1kHz, plus a tanpura drone mixed in.
 */

import { MelodyNote } from "./melody";

export const SAMPLE_RATE = 44_100;
const TONIC_HZ = 196; // Sa = G3

interface InstrumentVoice {
  /** Partial weights (index 0 = fundamental). */
  partials: number[];
  /** Attack seconds. */
  attack: number;
  /** Release seconds. */
  release: number;
  /** Sustain level 0..1 after attack decay. */
  sustain: number;
  /** Natural vibrato depth in semitones (0 for plucked instruments). */
  vibrato: number;
  /** Plucked: partials decay toward the fundamental after attack. */
  plucked: boolean;
}

const VOICES: Record<string, InstrumentVoice> = {
  // Solo-voice approximation: strong odd partials, gentle vibrato.
  voice: { partials: [1, 0.42, 0.18, 0.3, 0.1, 0.08], attack: 0.09, release: 0.18, sustain: 0.85, vibrato: 0.12, plucked: false },
  // Carnatic violin: warm, mid-rich, sliding.
  violin: { partials: [1, 0.55, 0.35, 0.22, 0.12, 0.08, 0.05], attack: 0.07, release: 0.2, sustain: 0.9, vibrato: 0.1, plucked: false },
  // Saraswati veena: plucked, metallic partials, fast decay.
  veena: { partials: [1, 0.8, 0.6, 0.45, 0.5, 0.3, 0.2, 0.12], attack: 0.006, release: 0.4, sustain: 0.45, vibrato: 0, plucked: true },
  // Bamboo venu: mostly fundamental, breathy edge on 2nd/3rd.
  venu_flute: { partials: [1, 0.28, 0.1, 0.05, 0.02], attack: 0.12, release: 0.22, sustain: 0.92, vibrato: 0.08, plucked: false },
  // Nadaswaram: reedy, hard-driven odd harmonics.
  nadaswaram: { partials: [1, 0.7, 0.85, 0.4, 0.5, 0.25, 0.3, 0.12], attack: 0.03, release: 0.15, sustain: 0.95, vibrato: 0.06, plucked: false },
  // Kadri-style saxophone: dark fundamental, rounded mids.
  saxophone: { partials: [1, 0.6, 0.25, 0.35, 0.12, 0.18, 0.06], attack: 0.05, release: 0.2, sustain: 0.88, vibrato: 0.12, plucked: false },
  // Sitar: plucked, buzzy jawari partials.
  sitar_fusion: { partials: [1, 0.65, 0.5, 0.7, 0.3, 0.4, 0.15, 0.2], attack: 0.004, release: 0.35, sustain: 0.4, vibrato: 0, plucked: true },
};

const voiceFor = (instrument: string): InstrumentVoice =>
  VOICES[instrument] ?? VOICES.violin;

/** Semitone-space pitch of a note at time t (from note onset). */
function semiAt(note: MelodyNote, tLocal: number): number {
  let s = note.semi;
  if (note.slideFrom !== undefined && note.slideFrom !== note.semi) {
    const slideDur = Math.min(0.35, note.dur * 0.3);
    if (tLocal < slideDur) {
      const k = tLocal / slideDur;
      const eased = k * k * (3 - 2 * k); // smoothstep
      s = note.slideFrom + (note.semi - note.slideFrom) * eased;
    }
  }
  return s;
}

/** Kampita oscillation in semitones at local time t (after attack). */
function kampitaOffset(note: MelodyNote, tLocal: number, attack: number): number {
  if (note.ornament !== "kampita" || tLocal < attack * 1.5) return 0;
  const depth = 0.55; // ~half a semitone-to-semitone oscillation
  const rate = 4.6 + Math.sin(note.t * 13.7) * 0.5; // ~4-5 Hz, note-varying
  return depth * Math.sin(2 * Math.PI * rate * (tLocal - attack));
}

/**
 * Render the melodic line. Writes into `out` (adds, doesn't overwrite).
 */
export function renderMelody(
  notes: MelodyNote[],
  instrument: string,
  duration: number,
  out: Float32Array,
): void {
  const voice = voiceFor(instrument);
  const norm =
    voice.partials.reduce((a, w) => a + w * w, 0) ** 0.5 || 1;

  for (const note of notes) {
    const start = Math.floor(note.t * SAMPLE_RATE);
    const end = Math.min(Math.floor((note.t + note.dur) * SAMPLE_RATE), out.length);
    let phase = 0;
    let prevFreq = TONIC_HZ * Math.pow(2, semiAt(note, 0) / 12);

    for (let i = start; i < end; i++) {
      const tLocal = i / SAMPLE_RATE - note.t;

      // Pitch: semitone path + kampita + natural vibrato.
      let semi = semiAt(note, tLocal) + kampitaOffset(note, tLocal, voice.attack);
      if (voice.vibrato > 0 && tLocal > voice.attack * 2) {
        semi += voice.vibrato * Math.sin(2 * Math.PI * 5.2 * tLocal);
      }
      const freq = TONIC_HZ * Math.pow(2, semi / 12);

      // Envelope.
      const tLeft = note.dur - tLocal;
      let env: number;
      if (tLocal < voice.attack) env = tLocal / voice.attack;
      else if (tLeft < voice.release) env = Math.max(0, tLeft / voice.release);
      else env = voice.sustain + (1 - voice.sustain) * Math.exp(-(tLocal - voice.attack) * (voice.plucked ? 3.5 : 1.5));
      if (voice.plucked && tLocal >= voice.attack) env *= Math.exp(-(tLocal - voice.attack) * 0.9);

      // Phase accumulates continuously (continuous pitch).
      phase += 2 * Math.PI * freq * (1 / SAMPLE_RATE);
      if (freq > prevFreq * 1.2 || freq < prevFreq / 1.2) phase = phase % (2 * Math.PI);
      prevFreq = freq;

      // Additive partials; upper partials decay faster on plucked voices.
      let sample = 0;
      for (let p = 0; p < voice.partials.length; p++) {
        const w = voice.partials[p];
        if (w === 0) continue;
        const partialEnv = voice.plucked ? Math.exp(-(tLocal - voice.attack) * p * 1.8) : 1;
        sample += w * partialEnv * Math.sin(phase * (p + 1));
      }
      out[i] += (sample / norm) * env * note.amp * 0.5;
    }
  }
}

/**
 * Tanpura drone: four-string cycle Pa(mandra)–Sa–Sa–Sa(tara)… actually the
 * classic pattern is Pa–Sa'–Sa'–Sa; each is an additive pluck with a long
 * decay tail. Quiet bed at ~18% of melody level.
 */
export function renderDrone(duration: number, out: Float32Array): void {
  const PARTIALS = [1, 0.7, 0.5, 0.6, 0.3, 0.35, 0.15];
  const cycleSemis = [7, 12, 12, 0]; // P, S', S', S
  const cycleLen = 4.2; // seconds per string
  const norm = Math.sqrt(PARTIALS.reduce((a, w) => a + w * w, 0));

  for (let startT = 0, idx = 0; startT < duration; startT += cycleLen, idx++) {
    const semi = cycleSemis[idx % cycleSemis.length];
    const freq = TONIC_HZ * Math.pow(2, semi / 12) / 2; // mandra register
    const start = Math.floor(startT * SAMPLE_RATE);
    const end = Math.min(out.length, start + Math.floor(cycleLen * 1.1 * SAMPLE_RATE));
    for (let i = start; i < end; i++) {
      const tLocal = i / SAMPLE_RATE - startT;
      const env = tLocal < 0.008 ? tLocal / 0.008 : Math.exp(-tLocal * 0.9);
      let s = 0;
      for (let p = 0; p < PARTIALS.length; p++) {
        s += PARTIALS[p] * Math.exp(-tLocal * p * 0.8) * Math.sin(2 * Math.PI * freq * (p + 1) * tLocal);
      }
      out[i] += (s / norm) * env * 0.1;
    }
  }
}

/** Render melody + drone, normalize, apply global fades. */
export function renderAlapana(
  notes: MelodyNote[],
  instrument: string,
  duration: number,
): Float32Array {
  const total = Math.floor(duration * SAMPLE_RATE);
  const pcm = new Float32Array(total);
  renderDrone(duration, pcm);
  renderMelody(notes, instrument, duration, pcm);

  // Normalize to ~0.85 peak, gentle 0.3s in / 0.8s out fades.
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const fadeIn = Math.floor(0.3 * SAMPLE_RATE);
  const fadeOut = Math.floor(0.8 * SAMPLE_RATE);
  for (let i = 0; i < total; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > total - fadeOut) g *= (total - i) / fadeOut;
    pcm[i] = Math.max(-1, Math.min(1, pcm[i] * g));
  }
  return pcm;
}
