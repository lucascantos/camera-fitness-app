// Ported from: data/progressions/boring_but_big.py (legacy FitnessApp repo)
//
// Boring But Big — sits on top of 5/3/1's main work and appends 5×10
// "back-off" sets of the same lift at 50% of training max. The
// classic Wendler hypertrophy template.
//
// State shape mirrors fiveThreeOne. We reuse its recordResult by
// delegating, then add the BBB backoff sets on top during prepareSession.

import type { Athlete } from "@/data/athlete/athlete";
import {
  makeSession,
  type Plan,
  type PrescribedSet,
  type Session,
} from "@/data/plans/plans";
import { planState, type ProgressionStrategy } from "./base";
import { fiveThreeOne } from "./fiveThreeOne";

interface VolumeState {
  week_index: number;
  training_max: Record<string, number>;
  _day_cursor: number;
}

const BACKOFF_PCT = 0.50;
const BACKOFF_SETS = 5;
const BACKOFF_REPS = 10;

const MAIN_LIFTS = new Set([
  "squat", "deadlift", "bench press", "overhead press",
]);

function roundToBar(kg: number): number {
  return Math.max(0, Math.round(kg / 2.5) * 2.5);
}

export const volume: ProgressionStrategy = {
  id:   "volume",
  name: "Volume",

  prepareSession(plan, dayIdx, athlete) {
    // First let 5/3/1 prepare the main-work session, then append BBB
    // backoff for every main lift in the day.
    const baseSession = fiveThreeOne.prepareSession(plan, dayIdx, athlete);
    const state = planState<VolumeState>(athlete, plan, {
      week_index: 0, training_max: {}, _day_cursor: 0,
    });

    const expanded = baseSession.workouts.flatMap((w) => {
      if (!MAIN_LIFTS.has(w.exercise)) return [w];
      const tm = state.training_max[w.exercise] ?? 0;
      const backoffWeight = roundToBar(tm * BACKOFF_PCT);
      const backoffSets: PrescribedSet[] = Array.from(
        { length: BACKOFF_SETS },
        () => [BACKOFF_REPS, backoffWeight, false] as PrescribedSet,
      );
      // Re-use makeSession's row shape — Session.SessionSet is a tuple.
      const wrapped: { exercise: string; sets: typeof w.sets } = {
        exercise: w.exercise,
        sets: [...w.sets, ...backoffSets.map((s) => [...s] as typeof w.sets[number])],
      };
      return [wrapped];
    });

    // We modified workouts in-place, return the updated session.
    const session: Session = {
      ...baseSession,
      workouts: expanded,
    };
    return session;
  },

  recordResult(plan, dayIdx, session, athlete) {
    // Same advancement / TM rules as 5/3/1.
    fiveThreeOne.recordResult(plan, dayIdx, session, athlete);
  },

  describe(plan, athlete) {
    const base = fiveThreeOne.describe?.(plan, athlete) ?? "Volume";
    return base.replace("5/3/1", "Volume (BBB)");
  },

  managedExercises: fiveThreeOne.managedExercises,
};

// Suppress narrowed-build unused-import warnings for makeSession.
void makeSession;
