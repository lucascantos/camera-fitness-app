// One-arm overhead triceps extension. Unilateral: the user does N reps with
// one arm, then N with the other. The Training flow chooses which arm is live
// via setSide(); this tracker only counts the active arm.
//
// Geometry: shoulder–elbow–wrist angle on the active side. Bottom of the rep =
// elbow flexed (small angle, weight lowered behind the head); top = locked out
// (large angle). A rep counts on the flexed → extended transition, so the full
// range of motion must be completed before another rep registers. The state
// machine needs CONFIRM_FRAMES consecutive readings to flip, which smooths out
// MediaPipe jitter near the thresholds.

import { LM, RepState, angle3D } from "../helpers";
import type { ExerciseTracker, Side } from "./types";
import { checkPosture, type PostureConstraint } from "./posture";

const FLEX_THRESHOLD = 75;      // elbow angle below this = flexed (working)
const EXTEND_THRESHOLD = 150;   // elbow angle above this = locked out (rest)
const CONFIRM_FRAMES = 3;

// [shoulder, elbow, wrist] for the elbow angle, per side.
const SIDE_LANDMARKS: Record<Side, [number, number, number]> = {
  right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  left:  [LM.LEFT_SHOULDER,  LM.LEFT_ELBOW,  LM.LEFT_WRIST],
};

// Posture: the upper arm must point up (elbow above the shoulder, overhead).
// The hip–shoulder–elbow angle is large when the arm is raised; it shrinks if
// the arm drops in front or out to the side — so this rejects reps done with
// the elbow flaring down instead of staying overhead.
const SIDE_POSTURE: Record<Side, PostureConstraint[]> = {
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

export function createOneArmTricepsTracker(initialSide: Side = "right"): ExerciseTracker {
  let side: Side = initialSide;
  let state: RepState = RepState.EXTENDED;
  let confirm = 0;
  let count = 0;
  let lastAngle: number | null = null;
  let formError: string | null = null;

  function resetState() {
    state = RepState.EXTENDED;
    confirm = 0;
    lastAngle = null;
    formError = null;
  }

  return {
    name: "one arm triceps extension",
    unilateral: true,
    get side() { return side; },
    get angle() { return lastAngle; },
    get repCount() { return count; },
    get formError() { return formError; },
    setSide(next: Side) {
      side = next;
      count = 0;
      resetState();
    },
    reset() {
      count = 0;
      resetState();
    },
    feed(screen, world) {
      const lms = world ?? screen;
      const [ai, bi, ci] = SIDE_LANDMARKS[side];
      const a = lms[ai], b = lms[bi], c = lms[ci];
      if (!a || !b || !c) return count;

      const ang = angle3D(a, b, c);
      if (!isFinite(ang)) return count;
      lastAngle = ang;

      // Posture gate — freeze the state machine while form is off.
      formError = checkPosture(lms, SIDE_POSTURE[side]);
      if (formError) { confirm = 0; return count; }

      const target =
        ang < FLEX_THRESHOLD   ? RepState.CURLED :
        ang > EXTEND_THRESHOLD ? RepState.EXTENDED :
        RepState.MID;
      if (target !== state && target !== RepState.MID) {
        confirm += 1;
        if (confirm >= CONFIRM_FRAMES) {
          // Count a rep on the flexed → locked-out transition (full ROM).
          if (state === RepState.CURLED && target === RepState.EXTENDED) {
            count += 1;
          }
          state = target;
          confirm = 0;
        }
      } else {
        confirm = 0;
      }
      return count;
    },
  };
}
