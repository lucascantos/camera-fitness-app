import type { Landmark } from "../helpers";

export interface ExerciseTracker {
  name: string;
  reset(): void;
  /** Feed one frame's landmarks; returns the current rep count. */
  feed(screen: Landmark[], world: Landmark[] | null): number;
  /** Latest angle of interest, for UI display. */
  angle: number | null;
  repCount: number;
}
