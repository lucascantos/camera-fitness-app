// Ported from: scenes/statistics.py (legacy FitnessApp repo, Body Map tab)
// Muscle-region geometry + per-muscle rep totals + ranking helpers.

import { getAthlete } from "@/data/athlete/athlete";

/** Region defined in normalized 0..1 coordinates inside the figure bbox. */
export type Region = [nx: number, ny: number, nw: number, nh: number];

// ── Muscle → primary exercises (ported verbatim from legacy) ──────────────
export const MUSCLE_EXERCISES: Record<string, string[]> = {
  Chest:        ["push ups", "bench press"],
  Biceps:       ["bicep curl", "barbell row"],
  Triceps:      ["push ups", "bench press", "overhead press"],
  "Front Delts":["overhead press", "push ups", "bench press"],
  "Side Delts": ["lateral raise"],
  "Rear Delts": ["barbell row"],
  Lats:         ["barbell row", "deadlift"],
  Traps:        ["deadlift", "barbell row", "overhead press"],
  Abs:          ["squat"],
  Quads:        ["squat"],
  Hamstrings:   ["deadlift", "squat"],
  Glutes:       ["deadlift", "squat"],
  Forearms:     ["bicep curl", "barbell row", "deadlift"],
  Calves:       [],
  Adductors:    ["squat"],
};

// ── Bilateral region tables (ported verbatim) ────────────────────────────
export const FRONT_MUSCLES: Record<string, Region[]> = {
  Chest:        [[0.22, 0.17, 0.56, 0.14]],
  Abs:          [[0.30, 0.31, 0.40, 0.17]],
  "Front Delts":[[0.03, 0.15, 0.14, 0.12], [0.83, 0.15, 0.14, 0.12]],
  "Side Delts": [[0.01, 0.19, 0.09, 0.09], [0.90, 0.19, 0.09, 0.09]],
  Biceps:       [[0.04, 0.23, 0.12, 0.11], [0.84, 0.23, 0.12, 0.11]],
  Forearms:     [[0.05, 0.34, 0.12, 0.14], [0.83, 0.34, 0.12, 0.14]],
  Quads:        [[0.26, 0.55, 0.20, 0.20], [0.54, 0.55, 0.20, 0.20]],
  Adductors:    [[0.36, 0.57, 0.28, 0.16]],
  Calves:       [[0.28, 0.76, 0.17, 0.19], [0.55, 0.76, 0.17, 0.19]],
};

export const BACK_MUSCLES: Record<string, Region[]> = {
  Traps:        [[0.22, 0.15, 0.56, 0.12]],
  "Rear Delts": [[0.03, 0.15, 0.14, 0.12], [0.83, 0.15, 0.14, 0.12]],
  Lats:         [[0.22, 0.27, 0.14, 0.18], [0.64, 0.27, 0.14, 0.18]],
  Triceps:      [[0.03, 0.22, 0.13, 0.14], [0.84, 0.22, 0.13, 0.14]],
  Glutes:       [[0.26, 0.48, 0.48, 0.11]],
  Hamstrings:   [[0.26, 0.55, 0.20, 0.20], [0.54, 0.55, 0.20, 0.20]],
  Calves:       [[0.28, 0.76, 0.17, 0.19], [0.55, 0.76, 0.17, 0.19]],
};

// ── Aggregation ──────────────────────────────────────────────────────────
export type MuscleCounts = Record<string, number>;

/** Total reps logged per muscle, derived from athlete history. */
export function muscleRepCounts(): MuscleCounts {
  const exerciseTotals: Record<string, number> = {};
  for (const entry of getAthlete().history) {
    for (const ex of entry.exercises) {
      const r = ex.sets.reduce((s, x) => s + x.reps, 0);
      if (r > 0) exerciseTotals[ex.exercise] = (exerciseTotals[ex.exercise] ?? 0) + r;
    }
  }
  const out: MuscleCounts = {};
  for (const [muscle, exs] of Object.entries(MUSCLE_EXERCISES)) {
    let total = 0;
    for (const ex of exs) total += exerciseTotals[ex] ?? 0;
    out[muscle] = total;
  }
  return out;
}

/** Sorted rankings — most trained first, least last. */
export function muscleRanking(counts: MuscleCounts): { muscle: string; reps: number }[] {
  return Object.entries(counts)
    .map(([muscle, reps]) => ({ muscle, reps }))
    .sort((a, b) => b.reps - a.reps);
}

/** The N least-trained muscles, by absolute rep count. */
export function neglectedMuscles(counts: MuscleCounts, n = 5): { muscle: string; reps: number }[] {
  return Object.entries(counts)
    .map(([muscle, reps]) => ({ muscle, reps }))
    .sort((a, b) => a.reps - b.reps)
    .slice(0, n);
}

/** Heat level 0..1 for a muscle, given the highest rep count in the set. */
export function heatLevel(reps: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, reps / max);
}
