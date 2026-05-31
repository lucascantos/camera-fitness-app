// Helpers for "best set" / personal-record lookups out of athlete history.

import { getAthlete } from "@/data/athlete/athlete";

export interface BestSet {
  weight: number;
  reps: number;
}

/**
 * Heaviest set ever recorded for `exercise`. When two sets share the same
 * top weight, the one with more reps wins (more work). Returns null when
 * the exercise has no recorded history.
 */
export function bestSetFor(exercise: string): BestSet | null {
  let best: BestSet | null = null;
  for (const entry of getAthlete().history) {
    for (const ex of entry.exercises) {
      if (ex.exercise !== exercise) continue;
      for (const s of ex.sets) {
        if (s.reps <= 0) continue;
        if (!best
          || s.weight > best.weight
          || (s.weight === best.weight && s.reps > best.reps)) {
          best = { weight: s.weight, reps: s.reps };
        }
      }
    }
  }
  return best;
}

/**
 * The most recently logged set for `exercise`. Scans history newest-first and,
 * within the matching workout, returns the last set the athlete actually did
 * (skipping empty/zero-rep sets). Used to pre-fill a standalone exercise with
 * the weight/reps the user last worked at. Returns null with no history.
 */
export function lastSetFor(exercise: string): BestSet | null {
  const history = getAthlete().history;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    for (let j = entry.exercises.length - 1; j >= 0; j--) {
      const ex = entry.exercises[j];
      if (ex.exercise !== exercise) continue;
      for (let k = ex.sets.length - 1; k >= 0; k--) {
        const s = ex.sets[k];
        if (s.reps <= 0) continue;
        return { weight: s.weight, reps: s.reps };
      }
    }
  }
  return null;
}

export function formatBest(best: BestSet | null): string {
  if (!best) return "—";
  if (best.weight === 0) return `${best.reps} reps`;
  // Drop trailing ".0" so "7.5" prints clean but "60" doesn't show as "60.0".
  const w = Number.isInteger(best.weight) ? best.weight : best.weight.toFixed(1);
  return `${w}kg × ${best.reps}`;
}
