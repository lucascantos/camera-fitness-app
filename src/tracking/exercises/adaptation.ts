// Within-set range adaptation.
//
// The same athlete performing the same movement measures very differently from
// one session to the next — in the captured data a barbell row's working angle
// bottomed out at 81° in one set and 123° in another, purely from where the
// phone was. No stored profile survives that, because the quantity that
// changed is the projection, not the body.
//
// So the tracker estimates the athlete's range from the set it is currently
// watching: every frame is buffered, and periodically the range is re-estimated
// from everything seen so far. The caller then re-runs the state machine over
// the whole buffer under the revised thresholds. Re-counting rather than only
// applying the new thresholds going forward is what makes this free: no reps
// are lost to the observation window, because the observation window is
// re-counted.

import { deriveThresholds } from "@/data/calibration/derive";
import type { AnchorPair } from "@/data/calibration/anchors";
import type { Sample } from "./stateMachine";

/** Frames observed before the first range revision. */
export const ADAPT_MIN_SAMPLES = 25;
/** Re-estimate every N frames — cheap, but no point doing it per frame. */
export const ADAPT_EVERY = 10;
/** Cap the buffer so a very long set can't grow without bound. */
export const MAX_SAMPLES = 4000;

/**
 * Percentiles taken as the observed rest and work anchors.
 *
 * Deliberately not the extremes. An anchor should describe where the athlete
 * *typically* gets to, not the furthest they ever got — anchoring on p5/p95 and
 * then demanding a return to rest+25% of that span asks them to match their
 * best-ever rep every time. Swept across the captured traces: p5/p95 scored 94,
 * p10/p90 86, p15/p85 78, p20/p80 75, p25/p75 83. The p5/p95 setting also made
 * overhead press *worse* than no adaptation at all, which is what surfaced the
 * problem.
 */
const LO_PCT = 0.20;
const HI_PCT = 0.80;

/** Minimum unblocked frames before a revision is meaningful. */
const MIN_ANGLES = 15;

/**
 * Revise the work/rest thresholds from the range observed so far in this set.
 * Returns null when there isn't enough clean data yet.
 */
export function reviseThresholds(
  samples: Sample[],
  reference: AnchorPair,
  inverted: boolean,
): { work: number; rest: number } | null {
  const angles = samples.filter((s) => !s.blocked).map((s) => s.angle);
  if (angles.length < MIN_ANGLES) return null;

  const sorted = [...angles].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const lo = at(LO_PCT);
  const hi = at(HI_PCT);

  const observed: AnchorPair = {
    ...reference,
    rest: inverted ? lo : hi,
    work: inverted ? hi : lo,
  };
  return deriveThresholds(observed, reference);
}
