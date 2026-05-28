// Ported from: tracking/exercises/bicep_curls.py (legacy FitnessApp repo)
// Watches the right elbow angle. A rep counts on the transition curled → extended.

import { LM, RepState, angle3D, type Landmark } from "../helpers";
import type { ExerciseTracker } from "./types";

const CURL_THRESHOLD = 100;     // elbow angle below this = "curled"
const EXTEND_THRESHOLD = 130;   // elbow angle above this = "extended"
const CONFIRM_FRAMES = 3;

export function createBicepCurlTracker(): ExerciseTracker {
  let state: RepState = RepState.EXTENDED;
  let confirm = 0;
  let count = 0;
  let lastAngle: number | null = null;

  return {
    name: "bicep curl",
    get angle() { return lastAngle; },
    get repCount() { return count; },
    reset() {
      state = RepState.EXTENDED;
      confirm = 0;
      count = 0;
      lastAngle = null;
    },
    feed(screen, world) {
      const lms = world ?? screen;
      const sh = lms[LM.RIGHT_SHOULDER];
      const el = lms[LM.RIGHT_ELBOW];
      const wr = lms[LM.RIGHT_WRIST];
      if (!sh || !el || !wr) return count;
      const a = angle3D(sh, el, wr);
      lastAngle = a;

      // State machine — needs CONFIRM_FRAMES consecutive readings to flip.
      const target =
        a < CURL_THRESHOLD ? RepState.CURLED :
        a > EXTEND_THRESHOLD ? RepState.EXTENDED :
        RepState.MID;
      if (target !== state && target !== RepState.MID) {
        confirm += 1;
        if (confirm >= CONFIRM_FRAMES) {
          // Count a rep on curled → extended (full ROM completed).
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
