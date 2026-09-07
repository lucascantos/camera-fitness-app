// Maps exercise name → tracker instance, with the athlete's calibration applied.
//
// This is the one place thresholds enter the tracking layer. Each exercise
// declares its geometry (which joint, which form constraints, which extra
// angles to log); the opening thresholds are derived from population default
// anchors, and the tracker then adapts them to the set actually being
// performed (see generic.ts).
//
// There is deliberately no stored per-athlete profile. One was built and
// measured against 27 labelled sets: with within-set adaptation enabled it
// changed the result on exactly zero of them (total error 77 either way),
// because adaptation re-counts the whole set and overwrites whatever the
// profile contributed to the opening thresholds. See
// docs/calibration-devlog.md, finding 18.

import type { ExerciseTracker } from "./types";
import { createAngleTracker } from "./generic";
import { GEOMETRY } from "./geometry";
import { defaultAnchors } from "@/data/calibration/anchors";
import { deriveThresholds, type Thresholds } from "@/data/calibration/derive";

export const TRACKED_EXERCISES = [
  "bicep curl",
  "squat",
  "push ups",
  "bench press",
  "deadlift",
  "overhead press",
  "barbell row",
  "lateral raise",
  "one arm triceps extension",
  "hammer curl",
  "skull crusher",
  "dumbbell fly",
  "split squat",
  "front squat",
  "dumbbell row",
  "dumbbell press",
  "barbell curl",
  "dumbbell deadlift",
  "dumbbell overhead press",
  "dumbbell squat",
] as const;

// MediaPipe pairs each joint as (left, right) with consecutive indices, so the
// opposite side of any triple is a straight index swap.
const MIRROR: Record<number, number> = {
  11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15,
  23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27,
};
const mirrorTriple = (t: [number, number, number]): [number, number, number] =>
  [MIRROR[t[0]] ?? t[0], MIRROR[t[1]] ?? t[1], MIRROR[t[2]] ?? t[2]];

/** The angle triple an exercise watches, for the session calibrator. */
export function trackedLandmarks(exercise: string): [number, number, number] | null {
  return GEOMETRY[exercise]?.landmarks ?? null;
}

/** Whether the exercise is counted one side at a time (right arm, then left). */
export function isUnilateral(exercise: string): boolean {
  return Boolean(GEOMETRY[exercise]?.unilateral);
}

/** Returns a fresh tracker for the named exercise, or null for manual mode. */
export function getTracker(exercise: string): ExerciseTracker | null {
  const geometry = GEOMETRY[exercise];
  if (!geometry) return null;
  const reference = defaultAnchors(exercise);
  if (!reference) return null;

  const opening = deriveThresholds(reference, reference);
  // Bilateral movements watch both sides and count on the better-observed one.
  // Unilateral ones don't: there, the side *is* the exercise.
  const mirror = geometry.unilateral ? undefined : mirrorTriple(geometry.landmarks);
  return createAngleTracker({
    name: exercise,
    ...geometry,
    mirrorLandmarks: mirror,
    mirrorPosture: geometry.posture?.map((c) => ({
      ...c, landmarks: mirrorTriple(c.landmarks),
    })),
    workThreshold: opening.work,
    restThreshold: opening.rest,
    // Population defaults are only a starting point for the first few seconds;
    // the tracker then measures this athlete's range from the set in progress.
    adaptive: { reference },
  });
}

/** Opening thresholds for an exercise — recorded into diagnostic traces. */
export function openingThresholds(exercise: string): Thresholds | null {
  const ref = defaultAnchors(exercise);
  return ref ? deriveThresholds(ref, ref) : null;
}
