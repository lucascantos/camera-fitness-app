// Changing what comes next, from the between-exercises screen: pick another
// of today's remaining exercises to do now, or swap one for an alternative
// that works the same muscle. Both only touch this session, never the plan.

import type { Session, SessionSet } from "@/data/plans/plans";
import { lastSetFor } from "@/data/athlete/bestSet";
import { EXERCISE_CATALOG, exerciseMeta, isTracked, type ExerciseMeta } from "@/data/exercises/catalog";

type Workout = Session["workouts"][number];

/**
 * Today's remaining exercises with `chosen` (an index into `remaining`) moved
 * to the front and the rest kept in their order. Always built from the same
 * snapshot, so swiping back to the first card restores the original order.
 */
export function withChosenFirst(remaining: Workout[], chosen: number): Workout[] {
  return [remaining[chosen], ...remaining.filter((_, i) => i !== chosen)];
}

/** Same session, with everything from `from` onward replaced by `upcoming`. */
export function setUpcoming(session: Session, from: number, upcoming: Workout[]): Session {
  return { ...session, workouts: [...session.workouts.slice(0, from), ...upcoming] };
}

/**
 * Other exercises for the same primary muscle: same equipment first, then
 * camera-tracked ones, then by name.
 */
export function alternativesFor(exercise: string): ExerciseMeta[] {
  const meta = exerciseMeta(exercise);
  if (!meta) return [];
  return EXERCISE_CATALOG
    .filter((m) => m.primary === meta.primary && m.name !== exercise)
    .sort((a, b) =>
      Number(b.equipment === meta.equipment) - Number(a.equipment === meta.equipment)
      || Number(isTracked(b.name)) - Number(isTracked(a.name))
      || a.name.localeCompare(b.name));
}

/**
 * `workout` turned into `exercise`: same sets and reps, nothing done yet. The
 * weight starts from the last time that exercise was done (or 0 for one never
 * done, which the setup step then asks for).
 */
export function swapExercise(workout: Workout, exercise: string): Workout {
  const weight = exerciseMeta(exercise)?.equipment === "bodyweight" ? 0 : lastSetFor(exercise)?.weight ?? 0;
  const sets = workout.sets.map(([reps, , amrap]) => [reps, weight, amrap] as SessionSet);
  return { exercise, sets };
}

/**
 * "3 × 5 reps · 60 kg" for an exercise card. 0 kg reads "bodyweight", as
 * everywhere else in the app (the Quickstart plan squats with 0 kg).
 */
export function setsSummary(sets: SessionSet[]): string {
  const first = sets[0];
  if (!first) return `${sets.length} sets`;
  const [reps, weight] = first;
  return `${sets.length} × ${reps} reps · ${weight > 0 ? `${weight} kg` : "bodyweight"}`;
}
