// Progression-strategy abstract surface — ported from
// data/progressions/base.py (legacy FitnessApp repo).
//
// A strategy decides:
//   - what today's session looks like, given the plan template and the
//     athlete's accumulated state (`prepareSession`)
//   - how that state evolves once the user finishes
//     (`recordResult`)
//
// State per plan lives on `athlete.progress[plan.id]`. The shape is
// opaque to the rest of the app; each strategy owns its keys.

import type { Athlete } from "@/data/athlete/athlete";
import type { Plan, Session } from "@/data/plans/plans";

export type ProgressionId = "linear" | "five_three_one" | "volume";

export interface ProgressionStrategy {
  id: ProgressionId;
  name: string;

  /** Build the Session that TrainingScene will run. May mutate nothing. */
  prepareSession(plan: Plan, dayIdx: number, athlete: Athlete): Session;

  /** Update athlete.progress[plan.id] based on what actually happened. */
  recordResult(
    plan: Plan,
    dayIdx: number,
    session: Session,
    athlete: Athlete,
  ): void;

  /** Optional human-readable detail (e.g. "Week 2 (3s)"). */
  describe?(plan: Plan, athlete: Athlete): string;

  /** Exercise names whose sets are auto-generated and not user-editable. */
  managedExercises?(plan: Plan): Set<string>;
}

// ── Shared helpers ────────────────────────────────────────────────────────

/** True when every set in this workout met or beat its target reps. */
export function exerciseHit(workout: Session["workouts"][number]): boolean {
  for (const s of workout.sets) {
    const target = s[0] as number;
    const actuals = s[3] as { reps: number } | undefined;
    if (!actuals || actuals.reps < target) return false;
  }
  return true;
}

/** Per-plan state slot; creates a fresh object if missing. */
export function planState<T extends object>(
  athlete: Athlete,
  plan: Plan,
  defaults: T,
): T {
  const all = athlete.progress as Record<string, T>;
  if (!all[plan.id]) all[plan.id] = { ...defaults };
  return all[plan.id];
}
