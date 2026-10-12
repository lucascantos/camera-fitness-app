// What the Home billboard can say. Each builder returns null when it has
// nothing worth showing, and the billboard rotates through the rest. Later
// slides (Calibration progress, the cycle's checkpoint, onboarding) slot in
// here as more builders — see docs/guided-mode-design.md.

import type { HistoryEntry, HistorySet } from "@/data/athlete/athlete";
import { latestValue, seriesFor, type BodyField } from "@/data/body/body";
import { isoWeekKey, mondayOf, parseISODate } from "@/data/stats/dates";
import { judge, type Verdict } from "@/data/stats/verdict";

export interface MonthNews {
  monthName: string; days: number; target: number; daysLeft: number;
}
export interface LatestNews {
  date: Date;
  rows: { exercise: string; verdict: Verdict | null }[];
}
export interface WeeksNews { counts: number[]; goal: number }
export interface BodyNews {
  field: BodyField; value: number; delta: number | null;
  series: number[];
}
export interface BestNews { exercise: string; weight: number; reps: number; date: Date }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/** Distinct training days in this calendar month vs the pace the goal implies. */
export function monthNews(history: HistoryEntry[], goal: number, today: Date): MonthNews {
  // Local date, not toISOString(): history dates are local, UTC would drift.
  const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const days = new Set(history.filter((e) => e.date.startsWith(prefix)).map((e) => e.date)).size;
  const inMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return {
    monthName: MONTHS[today.getMonth()],
    days,
    target: Math.round((goal * inMonth) / 7),
    daysLeft: inMonth - today.getDate(),
  };
}

/** The last workout, each exercise judged against its previous session. */
export function latestNews(history: HistoryEntry[]): LatestNews | null {
  const last = history[history.length - 1];
  const date = last && parseISODate(last.date);
  if (!last || !date) return null;
  const rows = last.exercises
    .filter((ex) => ex.sets.some((s) => s.reps > 0))
    .map((ex) => ({ exercise: ex.exercise, verdict: judge(ex.sets, previousSets(history, ex.exercise)) }));
  return rows.length ? { date, rows } : null;
}

function previousSets(history: HistoryEntry[], exercise: string): HistorySet[] | null {
  for (let i = history.length - 2; i >= 0; i--) {
    const ex = history[i].exercises.find((e) => e.exercise === exercise);
    if (ex && ex.sets.some((s) => s.reps > 0)) return ex.sets;
  }
  return null;
}

/** Training days per week for the last `n` weeks, oldest first, this week last. */
export function weeksNews(history: HistoryEntry[], goal: number, today: Date, n = 8): WeeksNews {
  const perWeek = new Map<string, Set<string>>();
  for (const e of history) {
    const d = parseISODate(e.date);
    if (!d) continue;
    const k = isoWeekKey(d);
    perWeek.set(k, (perWeek.get(k) ?? new Set()).add(e.date));
  }
  const counts: number[] = [];
  const cur = mondayOf(today);
  cur.setDate(cur.getDate() - 7 * (n - 1));
  for (let i = 0; i < n; i++) {
    counts.push(perWeek.get(isoWeekKey(cur))?.size ?? 0);
    cur.setDate(cur.getDate() + 7);
  }
  return { counts, goal };
}

/** Latest bodyweight (or waist) with its change over roughly a month. */
export function bodyNews(today: Date): BodyNews | null {
  for (const field of ["weight_kg", "waist_cm"] as BodyField[]) {
    const latest = latestValue(field);
    if (!latest) continue;
    const series = seriesFor(field);
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    const base = [...series].reverse().find((p) => p.date <= monthAgo) ?? series[0];
    const delta = series.length > 1 ? latest.value - base.value : null;
    return { field, value: latest.value, delta, series: series.slice(-12).map((p) => p.value) };
  }
  return null;
}

/** The most recent all-time best set (heavier, or more reps at the top weight) in 30 days. */
export function bestNews(history: HistoryEntry[], today: Date): BestNews | null {
  const best = new Map<string, HistorySet>();
  let found: BestNews | null = null;
  const since = new Date(today);
  since.setDate(today.getDate() - 30);
  for (const e of history) {
    const date = parseISODate(e.date);
    if (!date) continue;
    for (const ex of e.exercises) {
      for (const s of ex.sets) {
        if (s.reps <= 0) continue;
        const b = best.get(ex.exercise);
        const beats = b && (s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps));
        if (!b || beats) best.set(ex.exercise, s);
        if (beats && date >= since) found = { exercise: ex.exercise, weight: s.weight, reps: s.reps, date };
      }
    }
  }
  return found;
}
