// Text for the session preview: what each exercise asks for today and what
// the athlete did last time.

import type { SessionSet } from "@/data/plans/plans";
import { getAthlete } from "@/data/athlete/athlete";
import { formatBest } from "@/data/athlete/bestSet";
import { exerciseMeta, type Muscle } from "@/data/exercises/catalog";

const kg = (w: number) => `${Number.isInteger(w) ? w : w.toFixed(1)} kg`;

/** "3 × 10 · 20 kg", or "5 · 3 · 1+ · 60–80 kg" when the sets differ. */
export function describeSets(sets: SessionSet[]): string {
  if (sets.length === 0) return "No sets";
  const reps = sets.map(([r, , amrap]) => `${r}${amrap ? "+" : ""}`);
  const weights = sets.map(([, w]) => w);
  const lo = Math.min(...weights), hi = Math.max(...weights);
  const load = hi === 0 ? "" : lo === hi ? ` · ${kg(hi)}` : ` · ${kg(lo).replace(" kg", "")}–${kg(hi)}`;
  const sameReps = reps.every((r) => r === reps[0]);
  return (sameReps ? `${sets.length} × ${reps[0]}` : reps.join(" · ")) + load;
}

/**
 * The top set of the last session with this exercise ("Last: 77.5kg × 5"),
 * or null for an exercise never done before.
 */
export function describeLast(exercise: string): string | null {
  const history = getAthlete().history;
  for (let i = history.length - 1; i >= 0; i--) {
    const sets = history[i].exercises.find((e) => e.exercise === exercise)?.sets
      .filter((s) => s.reps > 0);
    if (!sets?.length) continue;
    const top = sets.reduce((a, b) =>
      b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a);
    return `Last: ${formatBest(top)}`;
  }
  return null;
}

/** Primary muscles across the session, in order of first appearance. */
export function sessionMuscles(exercises: string[]): Muscle[] {
  const out: Muscle[] = [];
  for (const e of exercises) {
    const m = exerciseMeta(e)?.primary;
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}
