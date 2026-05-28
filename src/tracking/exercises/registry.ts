import type { ExerciseTracker } from "./types";
import { createBicepCurlTracker } from "./bicepCurls";
import { createSquatTracker } from "./squat";

/** Returns a fresh tracker instance for the named exercise, or null for manual. */
export function getTracker(exercise: string): ExerciseTracker | null {
  switch (exercise) {
    case "bicep curl": return createBicepCurlTracker();
    case "squat":      return createSquatTracker();
    // push ups, deadlift, bench press, overhead press, barbell row,
    // lateral raise — pending generic-tracker port. Falls back to manual.
    default: return null;
  }
}

export const TRACKED_EXERCISES = ["bicep curl", "squat"] as const;
