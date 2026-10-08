// One-line recap of an exercise the athlete just finished, for the screen
// between exercises. Deliberately small: sets, reps, top load, and whether
// anything beat their history. Must run before the session is awarded into
// history (Complete.tsx), or every set would be compared against itself.

import type { SessionSet } from "@/data/plans/plans";
import { bestSetFor } from "@/data/athlete/bestSet";

export interface ExerciseRecap {
  setsDone: number;
  totalReps: number;
  /** Heaviest load lifted for at least one rep; 0 for bodyweight. */
  topWeight: number;
  /** What beat history, or null when nothing did (or there's no history). */
  best: "weight" | "reps" | null;
}

export function recapExercise(exercise: string, sets: SessionSet[]): ExerciseRecap {
  let setsDone = 0;
  let totalReps = 0;
  let topWeight = 0;
  let topReps = 0;       // most reps in one set at the top weight
  for (const s of sets) {
    const reps = s[3]?.reps ?? 0;
    const weight = s[3]?.weight ?? s[1];
    if (reps <= 0) continue;
    setsDone++;
    totalReps += reps;
    if (weight > topWeight) { topWeight = weight; topReps = reps; }
    else if (weight === topWeight && reps > topReps) topReps = reps;
  }

  const prev = bestSetFor(exercise);
  let best: ExerciseRecap["best"] = null;
  if (prev && setsDone > 0) {
    if (topWeight > prev.weight) best = "weight";
    else if (topWeight === prev.weight && topReps > prev.reps) best = "reps";
  }
  return { setsDone, totalReps, topWeight, best };
}
