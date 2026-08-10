// Quick Start scoring: surface the exercises whose muscles have seen the least
// work over the last 30 days.

import { getAthlete } from "@/data/athlete/athlete";
import { parseISODate } from "./dates";

const EX_MUSCLES: Record<string, string[]> = {
  "bicep curl":     ["Biceps", "Forearms"],
  "push ups":       ["Chest", "Triceps", "Front Delts"],
  "squat":          ["Quads", "Glutes", "Hamstrings"],
  "lateral raise":  ["Side Delts"],
  "deadlift":       ["Hamstrings", "Glutes", "Lats", "Traps"],
  "bench press":    ["Chest", "Triceps", "Front Delts"],
  "overhead press": ["Front Delts", "Triceps", "Traps"],
  "barbell row":    ["Lats", "Biceps", "Rear Delts", "Traps"],
};
const ALL_EXERCISES = Object.keys(EX_MUSCLES);

export function leastTrainedExercises(limit = 3): string[] {
  const a = getAthlete();
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const exReps: Record<string, number> = Object.fromEntries(
    ALL_EXERCISES.map((e) => [e, 0]),
  );
  for (const entry of a.history) {
    const d = parseISODate(entry.date);
    if (d && d.getTime() < cutoff) continue;
    for (const ex of entry.exercises) {
      if (ex.exercise in exReps) {
        exReps[ex.exercise] += ex.sets.reduce((s, r) => s + r.reps, 0);
      }
    }
  }
  const muscleReps: Record<string, number> = {};
  for (const ex of ALL_EXERCISES) {
    for (const m of EX_MUSCLES[ex]) {
      muscleReps[m] = (muscleReps[m] ?? 0) + exReps[ex];
    }
  }
  const score = (ex: string) =>
    EX_MUSCLES[ex].reduce((s, m) => s + 1 / (1 + (muscleReps[m] ?? 0)), 0);
  return [...ALL_EXERCISES].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
