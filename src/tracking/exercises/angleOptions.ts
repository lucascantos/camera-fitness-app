// Configuration for the generic angle tracker. One of these per exercise; see
// ./registry for the actual definitions.

import type { Side } from "./types";
import type { PostureConstraint } from "./posture";
import type { AnchorPair } from "@/data/calibration/anchors";

export interface AngleTrackerOptions {
  name: string;
  /** [a, b, c] — angle is measured at vertex b. */
  landmarks: [number, number, number];
  /** Per-side landmark triples, for unilateral movements. */
  sideLandmarks?: Record<Side, [number, number, number]>;
  /**
   * The opposite-side triple, enabling automatic side selection on bilateral
   * movements. The tracker watches both and counts on whichever the camera can
   * actually see — measured, one whole limb chain routinely drops to ~0.1
   * visibility while the other sits at ~0.95, purely from how the athlete is
   * turned. Ignored for unilateral exercises, where the side is the point.
   */
  mirrorLandmarks?: [number, number, number];
  /** Posture constraints for the mirrored side. */
  mirrorPosture?: PostureConstraint[];
  /** Angle at or beyond which the joint is in the working position. */
  workThreshold: number;
  /** Angle at or beyond which the joint is back at rest. */
  restThreshold: number;
  confirmFrames?: number;
  /** Form constraints that freeze the machine while violated. */
  posture?: PostureConstraint[];
  /** Per-side form constraints, for unilateral movements. */
  sidePosture?: Record<Side, PostureConstraint[]>;
  unilateral?: boolean;
  /**
   * Enables within-set range adaptation. The reference pair bounds how far the
   * observed range may stray from the population default, so one strange set
   * can't produce nonsense thresholds.
   */
  adaptive?: { reference: AnchorPair };
  /**
   * Extra angles recorded alongside the primary one. Diagnostics only — they
   * never gate counting. Useful for telling apart exercises that share a joint
   * (deadlift and barbell row both hinge at the hip), and for spotting when
   * the tracked side is the occluded one.
   */
  auxAngles?: Record<string, [number, number, number]>;
}
