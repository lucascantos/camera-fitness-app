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

export function formatBest(best: BestSet | null): string {
  if (!best) return "—";
  if (best.weight === 0) return `${best.reps} reps`;
  // Drop trailing ".0" so "7.5" prints clean but "60" doesn't show as "60.0".
  const w = Number.isInteger(best.weight) ? best.weight : best.weight.toFixed(1);
  return `${w}kg × ${best.reps}`;
}
