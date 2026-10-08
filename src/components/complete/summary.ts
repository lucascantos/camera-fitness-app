// What the Session Summary shows: for each exercise, how much was done today
// against the last session that included it. The comparison is the point —
// the screen exists to make progress visible, so every row answers "did I
// move forward?", not just "what did I do?".
//
// Must be built BEFORE the session is awarded into history, or every exercise
// would be compared against itself.

import type { Session } from "@/data/plans/plans";
import { getAthlete, type HistorySet } from "@/data/athlete/athlete";
import { recapExercise } from "@/components/training/recap";
import { buildDetail, type ExerciseDetail } from "./detail";
import { repMotion } from "./motion";
import { tracesFor } from "@/tracking/setTrace";

export interface SummaryRow {
  exercise: string;
  /** "kg" = Σ weight × reps; "reps" = Σ reps, for bodyweight work. */
  unit: "kg" | "reps";
  today: number;
  /** Same measure from the last session with this exercise, in the same unit. */
  last: number | null;
  /** Nothing in history at all — a first. */
  firstTime: boolean;
  best: "weight" | "reps" | null;
  /** Everything the exercise's own card shows. */
  detail: ExerciseDetail;
}

export interface SessionSummary {
  rows: SummaryRow[];
  totalReps: number;
  totalKg: number;
}

type Measured = { unit: "kg" | "reps"; value: number };

function measure(sets: HistorySet[]): Measured {
  const loaded = sets.some((s) => s.reps > 0 && s.weight > 0);
  let value = 0;
  for (const s of sets) value += loaded ? s.reps * s.weight : s.reps;
  return { unit: loaded ? "kg" : "reps", value };
}

/** The exercise's sets from the most recent session that included it. */
function lastSets(exercise: string): HistorySet[] | null {
  const history = getAthlete().history;
  for (let i = history.length - 1; i >= 0; i--) {
    const ex = history[i].exercises.find((e) => e.exercise === exercise);
    if (ex && ex.sets.some((s) => s.reps > 0)) return ex.sets;
  }
  return null;
}

export function buildSummary(session: Session): SessionSummary {
  let totalReps = 0;
  let totalKg = 0;
  const rows: SummaryRow[] = [];

  for (const [wi, w] of session.workouts.entries()) {
    const done: HistorySet[] = w.sets.map((s) => ({
      reps: s[3]?.reps ?? 0,
      weight: s[3]?.weight ?? s[1],
    }));
    if (!done.some((s) => s.reps > 0)) continue;   // skipped entirely

    const today = measure(done);
    const prevSets = lastSets(w.exercise);
    const prev = prevSets ? measure(prevSets) : null;
    for (const s of done) {
      totalReps += s.reps;
      totalKg += s.reps * s.weight;
    }

    rows.push({
      exercise: w.exercise,
      unit: today.unit,
      today: today.value,
      // Kilos against reps would be meaningless — only compare like with like.
      last: prev && prev.unit === today.unit ? prev.value : null,
      firstTime: prevSets === null,
      best: recapExercise(w.exercise, w.sets).best,
      detail: buildDetail(
        w.exercise, w.sets, today.unit, (sets) => measure(sets).value,
        repMotion(w.exercise, tracesFor(session.sessionId, wi)),
      ),
    });
  }
  return { rows, totalReps, totalKg };
}

/** Whole-percent change vs last time, or null when there's nothing to compare. */
export function changePct(row: SummaryRow): number | null {
  if (row.last == null || row.last <= 0) return null;
  return Math.round(((row.today - row.last) / row.last) * 100);
}
