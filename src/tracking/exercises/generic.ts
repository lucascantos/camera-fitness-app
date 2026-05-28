// Ported from: tracking/exercises/generic.py (legacy FitnessApp repo)
//
// A factory that builds an ExerciseTracker for any single-joint motion.
// Two directions are supported:
//
//   inverted: false (default)
//     Small angle = working position   (push-up bottom, row pull, bicep curl)
//     Large angle = rest position
//
//   inverted: true
//     Large angle = working position   (overhead press lockout, lateral raise top)
//     Small angle = rest position
//
// A rep counts on the transition back to rest, so the full ROM must be
// completed before another rep registers. The state machine needs
// CONFIRM_FRAMES consecutive readings to flip, which prevents
// stuttering when MediaPipe jitters between thresholds.

import { angle3D, RepState, type Landmark } from "../helpers";
import type { ExerciseTracker } from "./types";

const CONFIRM_FRAMES_DEFAULT = 3;

export interface AngleTrackerOptions {
  name: string;
  /** [a, b, c] — angle is measured at vertex b. */
  landmarks: [number, number, number];
  /**
   * Threshold for the working position. If inverted is false the joint
   * angle must drop below this; if inverted is true it must rise above.
   */
  workThreshold: number;
  /**
   * Threshold for the rest position. If inverted is false the joint
   * angle must rise above this; if inverted is true it must drop below.
   */
  restThreshold: number;
  inverted?: boolean;
  confirmFrames?: number;
}

export function createAngleTracker(opts: AngleTrackerOptions): ExerciseTracker {
  const {
    name, landmarks, workThreshold, restThreshold,
    inverted = false, confirmFrames = CONFIRM_FRAMES_DEFAULT,
  } = opts;

  let state: RepState = RepState.EXTENDED;
  let confirm = 0;
  let count = 0;
  let lastAngle: number | null = null;

  function classify(a: number): RepState {
    if (inverted) {
      if (a > workThreshold) return RepState.CURLED;
      if (a < restThreshold) return RepState.EXTENDED;
      return RepState.MID;
    }
    if (a < workThreshold) return RepState.CURLED;
    if (a > restThreshold) return RepState.EXTENDED;
    return RepState.MID;
  }

  return {
    name,
    get angle() { return lastAngle; },
    get repCount() { return count; },
    reset() {
      state = RepState.EXTENDED;
      confirm = 0;
      count = 0;
      lastAngle = null;
    },
    feed(screen: Landmark[], world: Landmark[] | null) {
      const lms = world ?? screen;
      const [ai, bi, ci] = landmarks;
      const a = lms[ai], b = lms[bi], c = lms[ci];
      if (!a || !b || !c) return count;

      const angle = angle3D(a, b, c);
      if (!isFinite(angle)) return count;
      lastAngle = angle;

      const target = classify(angle);
      if (target !== state && target !== RepState.MID) {
        confirm += 1;
        if (confirm >= confirmFrames) {
          // Count a rep on the curled → extended transition (full ROM).
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
