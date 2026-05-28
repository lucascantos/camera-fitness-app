// Background music driver — loops a single track at settings.musicVol.
// Drop a file at /public/music/loop.mp3 (or set MUSIC_URL below) to
// enable it. If the file is missing the calls fail silently.

import { getSettings } from "@/data/settings/settings";

const MUSIC_URL = "/music/loop.mp3";

let el: HTMLAudioElement | null = null;
let started = false;

function ensure(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!el) {
    el = new Audio(MUSIC_URL);
    el.loop = true;
    el.preload = "auto";
  }
  return el;
}

/** Begin or resume background music. Safe to call repeatedly. */
export async function startMusic(): Promise<void> {
  const a = ensure(); if (!a) return;
  const s = getSettings();
  a.volume = Math.max(0, Math.min(1, s.musicVol));
  if (started && !a.paused) return;
  try {
    await a.play();
    started = true;
  } catch {
    // Autoplay blocked or file missing — nothing more to do.
  }
}

export function stopMusic(): void {
  if (el) {
    try { el.pause(); } catch { /* ignore */ }
    started = false;
  }
}

/** Apply current settings.musicVol to the running track, if any. */
export function applyMusicVolume(): void {
  if (el) el.volume = Math.max(0, Math.min(1, getSettings().musicVol));
}
