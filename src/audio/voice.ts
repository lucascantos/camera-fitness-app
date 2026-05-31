// Voice-line playback driver. Uses HTMLAudioElement (not Web Audio) so
// missing voice clips just 404 silently and the bubble still shows.

import { getSettings } from "@/data/settings/settings";

const cache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;

/**
 * Play a voice clip from the given URL. Honors settings.voiceVol and
 * settings.trainerEnabled. Cuts off any previously playing voice so
 * back-to-back lines don't overlap.
 */
export async function playVoice(url: string | null): Promise<void> {
  if (!url) return;
  const s = getSettings();
  if (!s.trainerEnabled) return;
  if (s.voiceVol <= 0)   return;

  // Stop whatever was speaking.
  if (current) {
    try { current.pause(); current.currentTime = 0; } catch { /* ignore */ }
  }

  let audio = cache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = "auto";
    cache.set(url, audio);
  }
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, s.masterVol * s.voiceVol));
  current = audio;
  try {
    await audio.play();
  } catch {
    // File missing, autoplay blocked, etc. Bubble keeps showing text.
  }
}

/** Stop any in-flight voice clip immediately. */
export function stopVoice(): void {
  if (current) {
    try { current.pause(); current.currentTime = 0; } catch { /* ignore */ }
    current = null;
  }
}
