// Synthesised SFX via Web Audio API. No asset files — every sound is
// generated from oscillators so the app always has audible feedback
// without shipping any audio files.

import { getSettings } from "@/data/settings/settings";

let ctx: AudioContext | null = null;
let ctxReady = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor =
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext ?? window.AudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // iOS / Chrome require a user gesture to start audio. We attempt
  // resume on every call; harmless when already running.
  if (ctx.state === "suspended") ctx.resume().catch(() => { /* ignore */ });
  ctxReady = ctx.state === "running";
  return ctx;
}

/** Call from a user-gesture handler to unlock audio on iOS Safari. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => { /* ignore */ });
}

function sfxVol(): number {
  const s = getSettings();
  return Math.max(0, Math.min(1, s.masterVol * s.sfxVol));
}

/** Short tone that fires once per counted rep. */
export function repBeep(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain).connect(c.destination);
  osc.type            = "sine";
  osc.frequency.value = 660;                    // E5
  gain.gain.setValueAtTime(v * 0.18, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
  osc.start();
  osc.stop(c.currentTime + 0.13);
  void ctxReady;
}

/** Two-note ascending chime for set completion. */
export function setCompleteChime(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const notes = [523.25, 783.99]; // C5, G5
  notes.forEach((freq, i) => {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain).connect(c.destination);
    osc.type            = "triangle";
    osc.frequency.value = freq;
    const t0 = c.currentTime + i * 0.08;
    gain.gain.setValueAtTime(v * 0.22, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.start(t0);
    osc.stop(t0 + 0.30);
  });
}

/**
 * Distinct two-note "swap" cue for unilateral exercises — played when the
 * user should switch to the other arm. Descending (unlike the ascending
 * set-complete chime) so it reads as "change", not "done".
 */
export function switchSideChime(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const notes = [880, 587.33]; // A5 → D5, descending
  notes.forEach((freq, i) => {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain).connect(c.destination);
    osc.type            = "triangle";
    osc.frequency.value = freq;
    const t0 = c.currentTime + i * 0.12;
    gain.gain.setValueAtTime(v * 0.22, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  });
}

/** Short "tick" used in the rest countdown's final seconds. */
export function restTick(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain).connect(c.destination);
  osc.type            = "square";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(v * 0.10, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06);
  osc.start();
  osc.stop(c.currentTime + 0.07);
}

/** Longer fanfare for hitting a personal record / session complete. */
export function fanfare(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain).connect(c.destination);
    osc.type            = "triangle";
    osc.frequency.value = freq;
    const t0 = c.currentTime + i * 0.10;
    gain.gain.setValueAtTime(v * 0.20, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    osc.start(t0);
    osc.stop(t0 + 0.40);
  });
}

/**
 * Pre-set countdown beep: a short tone on 3, 2 and 1, then a higher, longer
 * one on "go" — the classic race-start pattern, so the start is audible
 * without looking at the screen.
 */
export function countdownBeep(go = false): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain).connect(c.destination);
  osc.type            = "triangle";
  osc.frequency.value = go ? 1046.5 : 523.25;   // C6 on go, C5 on the count
  const len = go ? 0.45 : 0.15;
  gain.gain.setValueAtTime(v * 0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + len);
  osc.start();
  osc.stop(c.currentTime + len + 0.01);
}

/**
 * Referee whistle for the end of a session: a short blast, then a long one.
 * The "pea" rattle of a real whistle is a fast wobble in pitch and volume, so
 * one LFO drives both.
 */
export function whistle(): void {
  const v = sfxVol(); if (v <= 0) return;
  const c = getCtx();  if (!c) return;
  const blast = (t0: number, len: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const pitchDepth = c.createGain();
    const ampDepth = c.createGain();
    osc.type = "sine";
    osc.frequency.value = 2900;
    lfo.frequency.value = 32;
    pitchDepth.gain.value = 140;
    ampDepth.gain.value = v * 0.05;
    lfo.connect(pitchDepth).connect(osc.frequency);
    lfo.connect(ampDepth).connect(gain.gain);
    osc.connect(gain).connect(c.destination);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(v * 0.12, t0 + 0.02);
    gain.gain.setValueAtTime(v * 0.12, t0 + len - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + len + 0.01); lfo.stop(t0 + len + 0.01);
  };
  blast(c.currentTime, 0.16);
  blast(c.currentTime + 0.24, 0.6);
}
