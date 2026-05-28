// Ported from: data/progressions/five_three_one.py (legacy FitnessApp repo)
//
// Wendler's classic 4-week cycle around the 4 main lifts:
//   Week 1 — 5/5/5+  at 65/75/85 % TM (top set AMRAP)
//   Week 2 — 3/3/3+  at 70/80/90 % TM
//   Week 3 — 5/3/1+  at 75/85/95 % TM
//   Week 4 — 5/5/5   at 40/50/60 % TM (deload, no AMRAP)
//
// After the deload week each TM is bumped (+5 kg lower body, +2.5 kg upper).
//
// State shape per plan:
//   { week_index: 0..3, training_max: { [name]: kg }, _day_cursor: number }
//
// Accessory exercises in the plan are left alone — the strategy only
// manages the 4 main lifts.

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

interface FiveThreeOneState {
  week_index: number;
  training_max: Record<string, number>;
  _day_cursor: number;
}

// (target_reps, percent_of_TM, isAmrap)
const WEEKS: ReadonlyArray<ReadonlyArray<readonly [number, number, boolean]>> = [
  [[5, 0.65, false], [5, 0.75, false], [5, 0.85, true]],
  [[3, 0.70, false], [3, 0.80, false], [3, 0.90, true]],
  [[5, 0.75, false], [3, 0.85, false], [1, 0.95, true]],
  [[5, 0.40, false], [5, 0.50, false], [5, 0.60, false]],   // deload
];

const WEEK_LABEL = ["Week 1 (5s)", "Week 2 (3s)", "Week 3 (5/3/1)", "Week 4 (deload)"];

// Increment applied to TM after every completed cycle.
const TM_INCREMENT: Record<string, number> = {
  "squat":          5.0,
  "deadlift":       5.0,
  "bench press":    2.5,
  "overhead press": 2.5,
};

const MAIN_LIFTS = new Set(Object.keys(TM_INCREMENT));

// Default training max if no per-lift override is stored yet.
const DEFAULT_TM: Record<string, number> = {
  "squat":          80,
  "deadlift":       100,
  "bench press":    60,
  "overhead press": 40,
};

function roundToBar(kg: number): number {
  // Round to the nearest 2.5 kg plate increment.
  return Math.max(0, Math.round(kg / 2.5) * 2.5);
}

export const fiveThreeOne: ProgressionStrategy = {
  id:   "five_three_one",
  name: "5/3/1",

  prepareSession(plan, dayIdx, athlete) {
    const state = planState<FiveThreeOneState>(athlete, plan, {
      week_index: 0,
      training_max: {},
      _day_cursor: 0,
    });

    const day = plan.workouts[dayIdx];
    if (!day) return makeSession(0, [], { planId: plan.id, workoutDayIndex: dayIdx });

    const week = WEEKS[state.week_index % WEEKS.length];

    const exercisesSets: [string, PrescribedSet[]][] = day.exercises.map((e) => {
      // Accessory exercises pass through unchanged.
      if (!MAIN_LIFTS.has(e.exercise)) {
        return [e.exercise, e.sets.map((s) => [...s] as PrescribedSet)];
      }
      const tm = state.training_max[e.exercise]
        ?? DEFAULT_TM[e.exercise]
        ?? Math.max(0, athlete.orm[e.exercise] ?? 0) * 0.9;
      // Seed the TM on first sight so future sessions read a stable value.
      if (!state.training_max[e.exercise]) state.training_max[e.exercise] = tm;

      const sets: PrescribedSet[] = week.map(([reps, pct, amrap]) =>
        [reps, roundToBar(tm * pct), amrap] as PrescribedSet,
      );
      return [e.exercise, sets];
    });

    return makeSession(day.name, exercisesSets, {
      planId: plan.id,
      workoutDayIndex: dayIdx,
    });
  },

  recordResult(plan, dayIdx, session, athlete) {
    const state = planState<FiveThreeOneState>(athlete, plan, {
      week_index: 0,
      training_max: {},
      _day_cursor: 0,
    });

    // Stash any AMRAP top-set rep count back into state? Not yet — the
    // legacy app doesn't either. AMRAP performance is logged via
    // history, which is enough to surface on Stats.

    state._day_cursor = (state._day_cursor + 1) % Math.max(1, plan.workouts.length);

    // If we just completed the last day of the week, advance.
    if (state._day_cursor === 0) {
      state.week_index = (state.week_index + 1) % WEEKS.length;
      // Cycle just finished (was the deload week): bump TMs.
      if (state.week_index === 0) {
        for (const lift of MAIN_LIFTS) {
          const inc = TM_INCREMENT[lift] ?? 2.5;
          state.training_max[lift] = roundToBar((state.training_max[lift] ?? 0) + inc);
        }
      }
    }

    // Failed top set (last set of a main lift didn't hit reps): hold TM
    // for that lift back by one increment so the next cycle isn't pushed.
    for (const w of session.workouts) {
      if (!MAIN_LIFTS.has(w.exercise)) continue;
      const lastSet = w.sets[w.sets.length - 1];
      if (!lastSet) continue;
      const target  = lastSet[0] as number;
      const actuals = lastSet[3] as { reps: number } | undefined;
      if (actuals && actuals.reps < target) {
        const inc = TM_INCREMENT[w.exercise] ?? 2.5;
        state.training_max[w.exercise] = roundToBar(
          Math.max(0, (state.training_max[w.exercise] ?? 0) - inc),
        );
      }
    }

    // Silence the unused-import warning in narrowed builds.
    void exerciseHit;
  },

  describe(_plan, athlete) {
    const state = athlete.progress[_plan.id] as FiveThreeOneState | undefined;
    if (!state) return "5/3/1 · Week 1";
    return `5/3/1 · ${WEEK_LABEL[state.week_index]}`;
  },

  managedExercises() {
    return MAIN_LIFTS;
  },
};
