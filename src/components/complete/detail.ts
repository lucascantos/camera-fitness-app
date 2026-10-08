// Data behind one exercise's detail card in the Session Summary: the sets as
// performed, today against last time, and a short trend of past sessions.
// Like summary.ts, it must be built before the session joins history.

import type { SessionSet } from "@/data/plans/plans";
import { getAthlete, type HistorySet } from "@/data/athlete/athlete";
import type { RepMotion } from "./motion";

export interface DetailSet {
  reps: number;
  target: number;
  weight: number;
  amrap: boolean;
  hit: boolean;
}

export interface TopSet { weight: number; reps: number }

export interface TrendPoint {
  date: string;      // YYYY-MM-DD; "" for today
  value: number;
  today: boolean;
}

export interface ExerciseDetail {
  sets: DetailSet[];
  setsHit: number;
  top: TopSet | null;
  lastTop: TopSet | null;
  /** Up to TREND_LEN sessions, oldest first, ending with today. */
  trend: TrendPoint[];
  /** Average rep + tempo; null without a camera trace (manual counts, reload). */
  motion: RepMotion | null;
}

const TREND_LEN = 8;

/** Heaviest set, more reps breaking a tie; for bodyweight, most reps. */
export function topSet(sets: HistorySet[]): TopSet | null {
  let best: TopSet | null = null;
  for (const s of sets) {
    if (s.reps <= 0) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = { weight: s.weight, reps: s.reps };
    }
  }
  return best;
}

export function buildDetail(
  exercise: string,
  sessionSets: SessionSet[],
  unit: "kg" | "reps",
  measure: (sets: HistorySet[]) => number,
  motion: RepMotion | null,
): ExerciseDetail {
  const sets: DetailSet[] = sessionSets.map((s) => {
    const reps = s[3]?.reps ?? 0;
    const target = s[0];
    const amrap = Boolean(s[2]);
    return { reps, target, weight: s[3]?.weight ?? s[1], amrap, hit: reps > 0 && (amrap || reps >= target) };
  });
  const done: HistorySet[] = sets.map(({ reps, weight }) => ({ reps, weight }));

  // Past sessions containing this exercise, newest last.
  const past: { date: string; sets: HistorySet[] }[] = [];
  for (const h of getAthlete().history) {
    const ex = h.exercises.find((e) => e.exercise === exercise);
    if (ex && ex.sets.some((s) => s.reps > 0)) past.push({ date: h.date, sets: ex.sets });
  }
  const last = past[past.length - 1];
  // A past session counts toward the trend only if it's measured the same way
  // (kilos vs reps), or the bars would mix units.
  const sameUnit = (p: { sets: HistorySet[] }) =>
    (p.sets.some((s) => s.reps > 0 && s.weight > 0) ? "kg" : "reps") === unit;

  const trend: TrendPoint[] = past
    .filter(sameUnit)
    .slice(-(TREND_LEN - 1))
    .map((p) => ({ date: p.date, value: measure(p.sets), today: false }));
  trend.push({ date: "", value: measure(done), today: true });

  return {
    sets,
    setsHit: sets.filter((s) => s.hit).length,
    top: topSet(done),
    lastTop: last ? topSet(last.sets) : null,
    trend,
    motion,
  };
}

/** "65 kg × 5", or "12 reps" for bodyweight. */
export function formatTop(t: TopSet | null): string {
  if (!t) return "—";
  return t.weight > 0 ? `${t.weight} kg × ${t.reps}` : `${t.reps} reps`;
}
