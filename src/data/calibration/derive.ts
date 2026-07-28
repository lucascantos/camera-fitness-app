// Turning anchors into thresholds.
//
// Thresholds are never stored — they are computed from the athlete's anchor
// pair every time a tracker is built. Two reasons: improving this function
// fixes every existing user without a re-calibration, and it keeps the stored
// profile a description of the person rather than of our current rule.
//
// The shape is the legacy one (data/calibration.py), which replaying the first
// captured traces validated: fed a realistic anchor pair it reproduced the
// thresholds an exhaustive sweep found optimal. Two guards were added on top,
// both from evidence in those traces — see docs/calibration-devlog.md.

import type { AnchorPair } from "./anchors";

/**
 * Fractions along the rest → work span at which the state machine switches.
 * Validated against the first dataset; treat as provisional until they've been
 * checked on a hinge and a squat pattern too.
 */
export const WORK_FRACTION = 0.62;
export const REST_FRACTION = 0.25;

/**
 * Bounds on how far an observed span may deviate from the population default.
 *
 * The legacy formula floored the span (guarding against two anchors collapsing
 * onto each other) but left it unbounded above. An inflated span turned out to
 * be the more damaging error by a wide margin — it pushes the work threshold
 * past the range the athlete actually occupies, and nothing counts. Clamping
 * both ends made accuracy nearly insensitive to a badly captured work anchor.
 */
export const SPAN_MIN_RATIO = 0.6;
export const SPAN_MAX_RATIO = 1.15;

export interface Thresholds {
  /** Cross this to be in the working position. */
  work: number;
  /** Cross this to be back at rest — a rep counts on this transition. */
  rest: number;
  /**
   * True when the working position is the *larger* angle. Derived from the
   * anchors rather than declared per exercise.
   */
  inverted: boolean;
  /** Gap between the two thresholds. Must exceed the measurement noise. */
  deadBand: number;
}

/**
 * Derive switching thresholds from an anchor pair.
 *
 * `reference` is the population default for the same exercise and is used only
 * to bound the span — pass the same pair to leave it unbounded in practice.
 */
export function deriveThresholds(anchors: AnchorPair, reference: AnchorPair): Thresholds {
  const refSpan = Math.abs(reference.work - reference.rest);
  const rawSpan = anchors.work - anchors.rest;
  const dir = Math.sign(rawSpan) || 1;

  const span = clamp(
    Math.abs(rawSpan),
    refSpan * SPAN_MIN_RATIO,
    refSpan * SPAN_MAX_RATIO,
  );

  const work = anchors.rest + dir * span * WORK_FRACTION;
  const rest = anchors.rest + dir * span * REST_FRACTION;

  return {
    work: round(work),
    rest: round(rest),
    inverted: dir > 0,
    deadBand: round(Math.abs(work - rest)),
  };
}

/**
 * Whether a derived threshold pair is usable given how noisy the measurement
 * is. A dead band narrower than the jitter guarantees the state machine will
 * oscillate no matter how well the anchors were placed, so we would rather
 * fall back to defaults than ship a profile we know cannot work.
 */
export function isViable(t: Thresholds, noiseFloor: number): boolean {
  return t.deadBand > noiseFloor * 1.5;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
