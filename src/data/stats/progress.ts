// All Progress sub-tab calculations live here, kept pure so they can be
// memoised in the React component without dragging stale closures around.
// Date arithmetic is in ./dates; the headline tiles are in ./headline.

import type { HistoryEntry } from "@/data/athlete/athlete";
import { diffDays, fmtDate, isoWeekKey, mondayOf, parseISODate } from "./dates";

export type TimeRange = "W" | "M" | "3M" | "Y" | "All";

export const RANGE_DAYS: Record<TimeRange, number> = {
  W: 7, M: 30, "3M": 90, Y: 365, All: 36500,
};

/** Session-count goal shown in the SESSIONS tile per time range. */
export const RANGE_SESSION_GOAL: Record<TimeRange, number> = {
  W: 3, M: 12, "3M": 36, Y: 144, All: 144,
};

// ── Range filter ────────────────────────────────────────────────────────
export interface FilteredHistory {
  entries: { date: Date; entry: HistoryEntry }[];
  rangeStart: Date;
  rangeEnd: Date;
}

export function filterByRange(history: HistoryEntry[], range: TimeRange): FilteredHistory {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - RANGE_DAYS[range]);
  const out: FilteredHistory["entries"] = [];
  for (const e of history) {
    const d = parseISODate(e.date);
    if (!d) continue;
    if (d >= start && d <= today) out.push({ date: d, entry: e });
  }
  return { entries: out, rangeStart: start, rangeEnd: today };
}

export function formatRangeLabel(f: FilteredHistory): string {
  if (f.entries.length === 0) {
    return `${fmtDate(f.rangeStart)} — ${fmtDate(f.rangeEnd)} · 0 sessions`;
  }
  const first = f.entries[0].date;
  const last  = f.entries[f.entries.length - 1].date;
  return `${fmtDate(first)} — ${fmtDate(last)} · ${f.entries.length} sessions`;
}

// ── 1RM (Epley) ─────────────────────────────────────────────────────────
export function epley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export interface OneRmPoint {
  date: Date;
  estimate: number;
}

/** Returns the maximum Epley estimate per session date for an exercise. */
export function oneRmSeries(f: FilteredHistory, exercise: string): OneRmPoint[] {
  const points: OneRmPoint[] = [];
  for (const { date, entry } of f.entries) {
    let max = 0;
    for (const ex of entry.exercises) {
      if (ex.exercise !== exercise) continue;
      for (const s of ex.sets) {
        const e = epley(s.weight, s.reps);
        if (e > max) max = e;
      }
    }
    if (max > 0) points.push({ date, estimate: max });
  }
  return points;
}

export function topExercisesByRecentVolume(f: FilteredHistory, n = 5): string[] {
  const totals: Record<string, number> = {};
  for (const { entry } of f.entries) {
    for (const ex of entry.exercises) {
      const v = ex.sets.reduce((s, x) => s + x.weight * x.reps, 0);
      if (v > 0) totals[ex.exercise] = (totals[ex.exercise] ?? 0) + v;
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, n);
}

// ── Weekly volume ───────────────────────────────────────────────────────
export interface WeeklyVolumePoint {
  weekStart: Date;
  volume: number; // total weight × reps in kilograms
}

export function weeklyVolume(f: FilteredHistory): WeeklyVolumePoint[] {
  const buckets: Record<string, WeeklyVolumePoint> = {};
  for (const { date, entry } of f.entries) {
    const key = isoWeekKey(date);
    if (!buckets[key]) buckets[key] = { weekStart: mondayOf(date), volume: 0 };
    for (const ex of entry.exercises) {
      for (const s of ex.sets) buckets[key].volume += s.weight * s.reps;
    }
  }
  return Object.values(buckets).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

// ── Activity heatmap ────────────────────────────────────────────────────
export interface HeatCell { date: Date; count: number; }

/** Returns `weeks` columns × 7 rows of days, oldest column first. */
export function activityGrid(history: HistoryEntry[], weeks = 12): HeatCell[][] {
  const todayMonday = mondayOf(new Date());
  const counts: Record<string, number> = {};
  for (const e of history) {
    const d = parseISODate(e.date);
    if (!d) continue;
    const k = d.toISOString().slice(0, 10);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const out: HeatCell[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(todayMonday);
      cellDate.setDate(todayMonday.getDate() - w * 7 + d);
      col.push({ date: cellDate, count: counts[cellDate.toISOString().slice(0, 10)] ?? 0 });
    }
    out.push(col);
  }
  return out;
}

// ── Progression deltas ──────────────────────────────────────────────────
export interface ProgressionRow {
  exercise: string;
  best: number;       // Epley estimate
  deltaKg: number;    // vs prior period
  daysAgo: number;    // days since the best set
}

export function progressionRows(history: HistoryEntry[], f: FilteredHistory, n = 4): ProgressionRow[] {
  // Top exercises by recent volume so the list isn't dominated by one lift.
  const exercises = topExercisesByRecentVolume(f, n);
  const today = new Date();
  return exercises.map((ex) => {
    let bestVal = 0;
    let bestDate: Date | null = null;
    // Prior best is the same scan restricted to before the range start.
    let priorBest = 0;
    for (const e of history) {
      const d = parseISODate(e.date);
      if (!d) continue;
      for (const x of e.exercises) {
        if (x.exercise !== ex) continue;
        for (const s of x.sets) {
          const v = epley(s.weight, s.reps);
          if (v > bestVal) { bestVal = v; bestDate = d; }
          if (d < f.rangeStart && v > priorBest) priorBest = v;
        }
      }
    }
    return {
      exercise: ex,
      best: bestVal,
      deltaKg: bestVal - priorBest,
      daysAgo: bestDate ? Math.max(0, diffDays(today, bestDate)) : 0,
    };
  });
}
