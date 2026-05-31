import type { Landmark } from "../helpers";

export type Side = "left" | "right";

export interface ExerciseTracker {
  name: string;
  reset(): void;
  /** Feed one frame's landmarks; returns the current rep count. */
  feed(screen: Landmark[], world: Landmark[] | null): number;
  /** Latest angle of interest, for UI display. */
  angle: number | null;
  repCount: number;
  /**
   * Posture/form problem detected on the latest frame, or null when form is
   * acceptable. Reps are NOT counted while this is set — the range-of-motion
   * angle alone isn't enough; the body must be in the right position too.
   * Surfaced in the status bar so the user knows how to fix their form.
   */
  formError?: string | null;
  /**
   * True for one-arm/unilateral exercises where each side is trained
   * separately (e.g. N reps right arm, then N reps left arm).
   */
  unilateral?: boolean;
  /** The side currently being counted (unilateral trackers only). */
  side?: Side;
  /**
   * Switch the active side for a unilateral tracker. Resets the rep
   * counter so the new side starts from zero.
   */
  setSide?(side: Side): void;
}
