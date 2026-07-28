// Ported from: data/calibration.py (legacy FitnessApp repo)
//
// Per-exercise *anchors* rather than per-exercise thresholds.
//
// An anchor pair describes the athlete, not the movement rule: where the joint
// sits at rest, and where it sits at the far end of a typical working rep.
// Thresholds are derived from those two numbers at use time (see ./derive.ts),
// so improving the derivation never requires re-calibrating anybody.
//
// The values here are population defaults — the cold start, used until the
// athlete's own numbers accumulate. The legacy profile's three measured joints
// (elbow, knee, lateral shoulder) are carried over verbatim; the rest are
// extrapolated from the same anatomy and are explicitly less trustworthy.
//
// Note the direction is implied by the anchors, not declared: when `work` is
// greater than `rest` the working position is the larger angle (an overhead
// lockout, the top of a lateral raise); when it's smaller, the working
// position is the flexed one (a curl, a squat, a push-up bottom). That removes
// the separate `inverted` flag the old tracker options carried.

export interface AnchorPair {
  /** Joint angle with the athlete at rest in the start position, degrees. */
  rest: number;
  /** Angle at the far end of a *typical working rep* — not a posed maximum. */
  work: number;
  /** Which joint this measures, so exercises sharing a joint can be related. */
  joint: string;
  /**
   * False where the pair is extrapolated rather than measured, so the
   * diagnostics can weight it accordingly.
   */
  fromLegacyMeasurement: boolean;
}

export const DEFAULT_ANCHORS: Record<string, AnchorPair> = {
  // ── Carried over from the legacy calibration profile ──
  "bicep curl": { rest: 165, work: 45, joint: "elbow", fromLegacyMeasurement: true },
  squat: { rest: 170, work: 95, joint: "knee", fromLegacyMeasurement: true },
  "lateral raise": { rest: 15, work: 85, joint: "shoulder-abduction", fromLegacyMeasurement: true },

  // ── Extrapolated. Same joints, plausible ranges, but unvalidated. ──
  "push ups": { rest: 165, work: 85, joint: "elbow", fromLegacyMeasurement: false },
  "bench press": { rest: 165, work: 75, joint: "elbow", fromLegacyMeasurement: false },
  "barbell row": { rest: 165, work: 75, joint: "elbow", fromLegacyMeasurement: false },
  "one arm triceps extension": { rest: 165, work: 55, joint: "elbow", fromLegacyMeasurement: false },
  deadlift: { rest: 175, work: 95, joint: "hip", fromLegacyMeasurement: false },
  // Working position is the *extended* overhead lockout, so work > rest here.
  "overhead press": { rest: 75, work: 170, joint: "elbow", fromLegacyMeasurement: false },
};

export function defaultAnchors(exercise: string): AnchorPair | null {
  return DEFAULT_ANCHORS[exercise] ?? null;
}
