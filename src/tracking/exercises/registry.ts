// Maps exercise name → tracker instance factory.

import { LM } from "../helpers";
import type { ExerciseTracker } from "./types";
import { createBicepCurlTracker } from "./bicepCurls";
import { createSquatTracker } from "./squat";
import { createAngleTracker } from "./generic";

export const TRACKED_EXERCISES = [
  "bicep curl",
  "squat",
  "push ups",
  "bench press",
  "deadlift",
  "overhead press",
  "barbell row",
  "lateral raise",
] as const;

/** Returns a fresh tracker for the named exercise, or null for manual. */
export function getTracker(exercise: string): ExerciseTracker | null {
  switch (exercise) {
    case "bicep curl":
      return createBicepCurlTracker();

    case "squat":
      return createSquatTracker();

    case "push ups":
      // Watch the right elbow.
      // Bottom (working) ≈ 90°, lockout (rest) ≈ 155°.
      return createAngleTracker({
        name: "push ups",
        landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
        workThreshold: 95,
        restThreshold: 150,
      });

    case "bench press":
      return createAngleTracker({
        name: "bench press",
        landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
        workThreshold: 80,
        restThreshold: 155,
      });

    case "deadlift":
      // Hip angle: shoulder-hip-knee. Hinged forward = small angle.
      return createAngleTracker({
        name: "deadlift",
        landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
        workThreshold: 115,
        restThreshold: 165,
      });

    case "overhead press":
      // Lockout overhead = elbow extended. Working = elbow extended, rest =
      // racked at shoulder height (small angle), so this is inverted.
      return createAngleTracker({
        name: "overhead press",
        landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
        workThreshold: 155,
        restThreshold: 100,
        inverted: true,
      });

    case "barbell row":
      return createAngleTracker({
        name: "barbell row",
        landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
        workThreshold: 90,
        restThreshold: 155,
      });

    case "lateral raise":
      // Shoulder angle: hip-shoulder-elbow. Arm down = small angle (rest),
      // arm raised = large angle (working). Inverted.
      return createAngleTracker({
        name: "lateral raise",
        landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
        workThreshold: 70,
        restThreshold: 25,
        inverted: true,
      });

    default:
      return null;
  }
}
