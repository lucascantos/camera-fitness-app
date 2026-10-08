// Audio feedback for a counted rep: a beep every time, plus a chime when a
// fixed-rep set reaches its target.

import { repBeep, setCompleteChime } from "@/audio/sfx";
import { getSettings } from "@/data/settings/settings";

/** The per-rep beep, unless the athlete muted it in Settings. */
export function beepRep(): void {
  if (getSettings().repSound) repBeep();
}

export function announceRep(reps: number, target: number, amrap: boolean): void {
  if (reps <= 0) return;

  // SFX: short beep on every counted rep, ascending chime when the
  // set finishes (non-AMRAP only).
  beepRep();

  if (!amrap && reps === target) setCompleteChime();
}
