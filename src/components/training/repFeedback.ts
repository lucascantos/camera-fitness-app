// Audio feedback for a counted rep: a beep every time, plus a chime when a
// fixed-rep set reaches its target.

import { repBeep, setCompleteChime } from "@/audio/sfx";

export function announceRep(reps: number, target: number, amrap: boolean): void {
  if (reps <= 0) return;

  // SFX: short beep on every counted rep, ascending chime when the
  // set finishes (non-AMRAP only).
  repBeep();

  if (!amrap && reps === target) setCompleteChime();
}
