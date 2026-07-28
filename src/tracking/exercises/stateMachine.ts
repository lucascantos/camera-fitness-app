// The rep-counting state machine, as a pure function over buffered samples.
//
// Split out from the tracker so it can be re-run cheaply over a whole set. That
// is what makes within-set adaptive thresholds possible: when the tracker
// revises its estimate of the athlete's range mid-set, it replays every frame
// seen so far under the new thresholds instead of only applying them going
// forward. Nothing is lost to the observation window, because the observation
// window is re-counted.
//
// A sample is just an angle plus whether the posture gate was blocking, so a
// whole set is a few hundred small objects — replaying it costs microseconds.

import { RepState } from "../helpers";
import type { NoCountReason } from "../log/types";

export interface Sample {
  angle: number;
  /** True when a posture constraint was violated on this frame. */
  blocked: boolean;
}

export interface StateMachineResult {
  count: number;
  /** Working extreme of each completed rep. */
  cycles: number[];
  /** Rest extreme preceding each working phase. */
  restCycles: number[];
  /** State after the final sample, for the debug overlay. */
  state: RepState;
  target: RepState;
  confirm: number;
  reason: NoCountReason;
}

export function runStateMachine(
  samples: Sample[],
  work: number,
  rest: number,
  confirmFrames: number,
): StateMachineResult {
  const inverted = work > rest;
  const classify = (a: number): RepState => {
    if (inverted) {
      if (a > work) return RepState.CURLED;
      if (a < rest) return RepState.EXTENDED;
      return RepState.MID;
    }
    if (a < work) return RepState.CURLED;
    if (a > rest) return RepState.EXTENDED;
    return RepState.MID;
  };

  let state: RepState = RepState.EXTENDED;
  let confirm = 0;
  let count = 0;
  const cycles: number[] = [];
  const restCycles: number[] = [];
  let cycleExtreme: number | null = null;
  let restExtreme: number | null = null;
  let target: RepState = RepState.EXTENDED;
  let reason: NoCountReason = "in-rest-zone";

  for (const s of samples) {
    if (s.blocked) {
      confirm = 0;
      target = state;
      reason = "posture-gate";
      continue;
    }

    // Track how far into each position this rep actually got.
    if (state === RepState.CURLED) {
      cycleExtreme =
        cycleExtreme == null ? s.angle
        : inverted ? Math.max(cycleExtreme, s.angle)
        : Math.min(cycleExtreme, s.angle);
    } else if (state === RepState.EXTENDED) {
      restExtreme =
        restExtreme == null ? s.angle
        : inverted ? Math.min(restExtreme, s.angle)
        : Math.max(restExtreme, s.angle);
    }

    target = classify(s.angle);
    const prevState = state;
    const prevConfirm = confirm;
    let counted = false;

    if (target !== state && target !== RepState.MID) {
      confirm += 1;
      if (confirm >= confirmFrames) {
        // A rep counts on the working → rest transition (full ROM completed).
        if (state === RepState.CURLED && target === RepState.EXTENDED) {
          count += 1;
          counted = true;
          if (cycleExtreme != null) cycles.push(r1(cycleExtreme));
        }
        if (target === RepState.CURLED) {
          if (restExtreme != null) restCycles.push(r1(restExtreme));
          cycleExtreme = s.angle;
        } else {
          restExtreme = s.angle;
        }
        state = target;
        confirm = 0;
      }
    } else {
      confirm = 0;
    }

    reason = classifyReason({
      state: prevState, target, confirm, prevConfirm,
      flipped: state !== prevState, counted,
    });
  }

  return { count, cycles, restCycles, state, target, confirm, reason };
}

function classifyReason(args: {
  state: RepState; target: RepState; confirm: number;
  prevConfirm: number; flipped: boolean; counted: boolean;
}): NoCountReason {
  const { state, target, confirm, prevConfirm, flipped, counted } = args;
  if (counted) return "counted";
  if (flipped) return "entered-work-zone";
  if (target === RepState.MID) return "mid-zone";
  if (target !== state) return confirm > 0 ? "confirming" : "confirm-reset";
  if (prevConfirm > 0 && confirm === 0) return "confirm-reset";
  return state === RepState.CURLED ? "in-work-zone" : "in-rest-zone";
}

const r1 = (v: number) => Math.round(v * 10) / 10;
