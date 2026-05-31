// Posture/form validation shared by trackers.
//
// Range-of-motion alone isn't enough to count a clean rep: a bicep curl flexes
// the elbow the same whether the upper arm hangs at the side (correct) or is
// raised out to the side / overhead (cheating). Each tracker declares a set of
// PostureConstraints — angles that must stay within a range for the rep to be
// valid. While any constraint is violated the tracker refuses to count and
// surfaces the constraint's hint so the user can correct their form.

import { angle3D, type Landmark } from "../helpers";

export interface PostureConstraint {
  /** [a, b, c] — angle measured at vertex b, in degrees. */
  landmarks: [number, number, number];
  /** Acceptable [min, max] range for that angle, inclusive. */
  range: [number, number];
  /** Shown to the user when the angle falls outside the range. */
  hint: string;
}

/**
 * Check every constraint against the frame. Returns the hint of the first
 * violated constraint, or null when all pass. Missing/non-finite landmarks
 * are skipped — we don't flag form when the user is simply partly out of
 * frame (that's reported separately as "move into frame").
 */
export function checkPosture(
  lms: Landmark[],
  constraints: PostureConstraint[],
): string | null {
  for (const ct of constraints) {
    const [ai, bi, ci] = ct.landmarks;
    const a = lms[ai], b = lms[bi], c = lms[ci];
    if (!a || !b || !c) continue;
    const ang = angle3D(a, b, c);
    if (!isFinite(ang)) continue;
    if (ang < ct.range[0] || ang > ct.range[1]) return ct.hint;
  }
  return null;
}
