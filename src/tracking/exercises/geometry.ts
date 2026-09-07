// The per-exercise geometry table: which joint each movement watches, the form
// constraints that gate a rep, and the extra angles logged for diagnostics.
// Thresholds live in src/data/calibration/ and enter via ./registry — this file
// is geometry only.
//
// The nine original entries carry the legacy anchors (see ../../data/calibration
// /anchors.ts). The later additions come in two shapes: a handful of genuinely
// new movements with their own entries, and implement variants (barbell ↔
// dumbbell) that are the same movement on the same joint — those alias the
// parent's geometry outright, differing only in their anchors and metadata.

import { LM } from "../helpers";
import type { AngleTrackerOptions } from "./generic";
import { CURL_POSTURE, PUSHUP_POSTURE, TRICEPS_POSTURE } from "./postures";

/** Everything about an exercise except its thresholds. */
export type Geometry = Omit<AngleTrackerOptions, "name" | "workThreshold" | "restThreshold">;

export const GEOMETRY: Record<string, Geometry> = {
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
    posture: PUSHUP_POSTURE,
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

  // ── New movements. Same joints as a close relative; anchors estimated. ──

  // Lying triceps extension. Elbow flexes and extends like a curl but for the
  // triceps; the upper arm points up off a bench, so there is no tucked-elbow
  // gate (cf. bench press).
  "skull crusher": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    auxAngles: { leftElbow: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] },
  },

  // Chest fly: the shoulder opens wide (large angle, rest) and closes the arms
  // together (small angle, work). Same triple as the lateral raise, opposite
  // working direction. The elbow angle is logged because it should stay roughly
  // fixed — a closing elbow means the athlete is pressing, not flying.
  "dumbbell fly": {
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
    auxAngles: {
      leftShoulder: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
      elbow: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    },
  },

  // Single-leg squat. Same knee-flexion geometry as the squat; the tracker
  // counts on the better-observed (front) leg.
  "split squat": {
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    auxAngles: {
      hip: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
      leftKnee: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    },
  },

  // One-arm dumbbell row — trained a side at a time, like the triceps
  // extension. The hinge is logged but not gated (as with the barbell row).
  "dumbbell row": {
    landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    sideLandmarks: {
      right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
      left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    },
    unilateral: true,
    auxAngles: { hip: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE] },
  },
};

// Implement variants — the same movement on the same joint, differing only in
// their anchors (../../data/calibration/anchors.ts) and catalog metadata. They
// share the parent's geometry object outright; geometry is read-only config, so
// the shared reference is safe. A hammer curl is a curl, a front squat a squat.
GEOMETRY["hammer curl"] = GEOMETRY["bicep curl"];
GEOMETRY["barbell curl"] = GEOMETRY["bicep curl"];
GEOMETRY["front squat"] = GEOMETRY["squat"];
GEOMETRY["dumbbell squat"] = GEOMETRY["squat"];
GEOMETRY["dumbbell press"] = GEOMETRY["bench press"];
GEOMETRY["dumbbell deadlift"] = GEOMETRY["deadlift"];
GEOMETRY["dumbbell overhead press"] = GEOMETRY["overhead press"];
