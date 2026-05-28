// Synthesised SFX via Web Audio API. No asset files — every sound is
// generated from oscillators so the app always has audible feedback
// even before any voice clips are recorded.

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
  return Math.max(0, Math.min(1, getSettings().sfxVol));
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
