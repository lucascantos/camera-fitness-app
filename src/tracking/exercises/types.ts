import type { Landmark } from "../helpers";
import type { TrackerDebug } from "../log/types";

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
  /**
   * State-machine internals for the most recent feed(), or null before the
   * first frame. Diagnostics only — nothing here feeds back into counting.
   * Consumed by the tracking log (src/tracking/log/) and the debug overlay,
   * both of which are dev-only and off by default.
   */
  debug?: TrackerDebug | null;
  /**
   * The angle thresholds this tracker switches on. Diagnostics only — lets the
   * debug overlay draw the work/rest bands against the live angle instead of
   * duplicating each tracker's constants.
   */
  bands?: { work: number; rest: number; inverted: boolean };
  /**
   * The working extreme reached on each completed rep, in order. This is what
   * calibration learns from — a real rep's range at real tempo, rather than the
   * inflated maximum people produce when asked to pose for a setup step.
   */
  cycles?: number[];
  /**
   * The rest extreme of each rep — how far back the athlete actually returned.
   * The passive stillness detector never fires for floor movements (the
   * athlete is already down there when the set starts), so this is the only
   * way those exercises ever learn a rest anchor.
   */
  restCycles?: number[];
}
