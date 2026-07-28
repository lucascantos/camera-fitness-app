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

import { LM } from "../helpers";
import type { ExerciseTracker, Side } from "./types";
import { createAngleTracker, type AngleTrackerOptions } from "./generic";
import type { PostureConstraint } from "./posture";
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
] as const;

/** Everything about an exercise except its thresholds. */
type Geometry = Omit<AngleTrackerOptions, "name" | "workThreshold" | "restThreshold">;

// Posture: the upper arm must hang at the side (elbow tucked). The angle at
// the shoulder between the hip and the elbow stays small when the arm is down;
// it grows when the arm is raised out to the side or overhead — which is the
// cheat that was letting curls count from any arm position.
const CURL_POSTURE: PostureConstraint[] = [{
  landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  range: [0, 45],
  hint: "Keep your elbow tucked at your side",
}];

// Posture: the upper arm must point up (elbow above the shoulder, overhead).
// The hip–shoulder–elbow angle is large when the arm is raised; it shrinks if
// the arm drops in front or out to the side.
const TRICEPS_POSTURE: Record<Side, PostureConstraint[]> = {
  right: [{
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
    range: [125, 180],
    hint: "Keep your upper arm pointing up",
  }],
  left: [{
    landmarks: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
    range: [125, 180],
    hint: "Keep your upper arm pointing up",
  }],
};

const GEOMETRY: Record<string, Geometry> = {
  "bicep curl": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    posture: CURL_POSTURE,
    auxAngles: { leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] },
  },

  squat: {
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    auxAngles: {
      // Hip angle separates a squat from a hinge; the left knee shows whether
      // the two legs agree, or whether the right is simply the occluded one.
      hip: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
      leftKnee: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    },
  },

  "one arm triceps extension": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    sideLandmarks: {
      right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
      left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    },
    sidePosture: TRICEPS_POSTURE,
    unilateral: true,
  },

  "push ups": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    auxAngles: {
      // Sagging or piking is the classic push-up form break, and a horizontal
      // body is also where MediaPipe struggles most.
      hipLine: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
      leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    },
  },

  "bench press": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    auxAngles: { leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] },
  },

  deadlift: {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
    auxAngles: {
      // Knee angle separates a deadlift from a squat — both close the hip.
      knee: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
      elbow: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    },
  },

  "overhead press": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    auxAngles: {
      // Elbow angle alone can't tell an overhead lockout from an arm hanging
      // straight down — the shoulder angle is what disambiguates.
      shoulder: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
      leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    },
  },

  "barbell row": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    auxAngles: {
      // The hinge should hold steady through a row; if it swings, the athlete
      // is heaving rather than rowing.
      hip: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
      leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    },
  },

  "lateral raise": {
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
    auxAngles: {
      leftShoulder: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
      elbow: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    },
  },
};

/** The angle triple an exercise watches, for the session calibrator. */
export function trackedLandmarks(exercise: string): [number, number, number] | null {
  return GEOMETRY[exercise]?.landmarks ?? null;
}

/** Returns a fresh tracker for the named exercise, or null for manual mode. */
export function getTracker(exercise: string): ExerciseTracker | null {
  const geometry = GEOMETRY[exercise];
  if (!geometry) return null;
  const reference = defaultAnchors(exercise);
  if (!reference) return null;

  const opening = deriveThresholds(reference, reference);
  return createAngleTracker({
    name: exercise,
    ...geometry,
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
