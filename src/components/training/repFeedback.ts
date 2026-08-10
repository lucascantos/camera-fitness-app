// Audio feedback for a counted rep: a beep every time, plus a trainer line on
// the milestones worth remarking on.

import { repBeep, setCompleteChime } from "@/audio/sfx";
import { say } from "@/data/trainers/say";
import type { LineCategory } from "@/data/trainers/trainer";

export function announceRep(reps: number, target: number, amrap: boolean): void {
  if (reps <= 0) return;

  // SFX: short beep on every counted rep, ascending chime when the
  // set finishes (non-AMRAP only).
  repBeep();

  let cat: LineCategory | null = null;
  if (!amrap && reps === target) {
    cat = "set_complete";
    setCompleteChime();
  }
  else if (!amrap && target >= 2 && reps === target - 1) cat = "milestone_last1";
  else if (!amrap && target >= 5 && reps === target - 3) cat = "milestone_last3";
  else if (!amrap && target >= 4 && reps === Math.ceil(target / 2)) cat = "milestone_half";
  else if (amrap && reps % 5 === 0)                      cat = "rep";
  else if (!amrap && reps % 3 === 0)                     cat = "rep";
  if (cat) say(cat);
}
