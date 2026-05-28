// Ported from: tracking/exercises/squat.py (legacy FitnessApp repo)
// Watches the right knee angle. Rep counts on standing back up after depth.

import { LM, RepState, angle3D } from "../helpers";
import type { ExerciseTracker } from "./types";

const DEPTH_THRESHOLD = 110;
const STAND_THRESHOLD = 155;
const CONFIRM_FRAMES = 3;

export function createSquatTracker(): ExerciseTracker {
  let state = RepState.EXTENDED;
  let confirm = 0;
  let count = 0;
  let lastAngle: number | null = null;

  return {
    name: "squat",
    get angle() { return lastAngle; },
    get repCount() { return count; },
    reset() {
      state = RepState.EXTENDED; confirm = 0; count = 0; lastAngle = null;
    },
    feed(screen, world) {
      const lms = world ?? screen;
      const hip = lms[LM.RIGHT_HIP], kn = lms[LM.RIGHT_KNEE], ak = lms[LM.RIGHT_ANKLE];
      if (!hip || !kn || !ak) return count;
      const a = angle3D(hip, kn, ak);
      lastAngle = a;
      const target =
        a < DEPTH_THRESHOLD ? RepState.CURLED :
        a > STAND_THRESHOLD ? RepState.EXTENDED : RepState.MID;
      if (target !== state && target !== RepState.MID) {
        confirm += 1;
        if (confirm >= CONFIRM_FRAMES) {
          if (state === RepState.CURLED && target === RepState.EXTENDED) count += 1;
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
