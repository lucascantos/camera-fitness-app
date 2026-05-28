// Ported from: data/progressions/linear.py (legacy FitnessApp repo)
//
// StrongLifts / Starting-Strength-style linear progression:
//   - Hit all prescribed reps  → add `increment` to the working weight
//   - Miss any reps            → bump fail_streak
//   - 3 consecutive misses     → deload to 90% of working weight, reset streak
//
// State shape per plan:
//   {
//     exercises: {
//       [name]: { working_weight: number, fail_streak: number }
//     },
//     _day_cursor: number,
//   }

import type { Athlete } from "@/data/athlete/athlete";
import {
  makeSession,
  type Plan,
  type PrescribedSet,
  type Session,
} from "@/data/plans/plans";
import {
  exerciseHit,
  planState,
  type ProgressionStrategy,
} from "./base";

interface ExerciseState { working_weight: number; fail_streak: number; }
interface LinearState {
  exercises: Record<string, ExerciseState>;
  _day_cursor: number;
}

const DEFAULT_INCREMENT_KG = 2.5;
const DELOAD_AT_FAILS      = 3;
const DELOAD_FACTOR        = 0.9;

export const linear: ProgressionStrategy = {
  id:   "linear",
  name: "Linear",

  prepareSession(plan, dayIdx, athlete) {
    const state = planState<LinearState>(athlete, plan, { exercises: {}, _day_cursor: 0 });
    const day   = plan.workouts[dayIdx];
    if (!day) return makeSession(0, [], { planId: plan.id, workoutDayIndex: dayIdx });

    const exercisesSets: [string, PrescribedSet[]][] = day.exercises.map((e) => {
      // Lazily seed the working weight from the plan's prescribed weight
      // the first time we see this exercise.
      if (!state.exercises[e.exercise]) {
        const seedWeight = e.sets[0]?.[1] ?? 0;
        state.exercises[e.exercise] = { working_weight: seedWeight, fail_streak: 0 };
      }
      const w = state.exercises[e.exercise].working_weight;
      // Same rep / amrap targets as the template, but weight comes from state.
      const sets = e.sets.map(([reps, _w, amrap]) =>
        [reps, w, amrap] as PrescribedSet,
      );
      return [e.exercise, sets];
    });

    return makeSession(day.name, exercisesSets, {
      planId: plan.id,
      workoutDayIndex: dayIdx,
    });
  },

  recordResult(plan, dayIdx, session, athlete) {
    const state = planState<LinearState>(athlete, plan, { exercises: {}, _day_cursor: 0 });

    for (const w of session.workouts) {
      // Bodyweight exercises (weight === 0) skip progression — no point.
      const exState = state.exercises[w.exercise]
        ?? { working_weight: 0, fail_streak: 0 };
      if (exState.working_weight === 0) continue;

      if (exerciseHit(w)) {
        exState.working_weight += DEFAULT_INCREMENT_KG;
        exState.fail_streak     = 0;
      } else {
        exState.fail_streak += 1;
        if (exState.fail_streak >= DELOAD_AT_FAILS) {
          exState.working_weight = Math.max(0,
            Math.round(exState.working_weight * DELOAD_FACTOR * 2) / 2); // .5 step
          exState.fail_streak    = 0;
        }
      }
      state.exercises[w.exercise] = exState;
    }

    // Cycle to the next workout day in the plan.
    state._day_cursor = (state._day_cursor + 1) % Math.max(1, plan.workouts.length);
  },

  describe(plan, athlete) {
    const state = athlete.progress[plan.id] as LinearState | undefined;
    if (!state) return "Linear";
    const lifts = Object.keys(state.exercises).length;
    return lifts > 0 ? `Linear · ${lifts} tracked lift${lifts === 1 ? "" : "s"}` : "Linear";
  },
};
