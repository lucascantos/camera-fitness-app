// All Progress sub-tab calculations live here, kept pure so they can be
// memoised in the React component without dragging stale closures around.

import type { HistoryEntry } from "@/data/athlete/athlete";

export type TimeRange = "W" | "M" | "3M" | "Y" | "All";

export const RANGE_DAYS: Record<TimeRange, number> = {
  W: 7, M: 30, "3M": 90, Y: 365, All: 36500,
};

/** Session-count goal shown in the SESSIONS tile per time range. */
export const RANGE_SESSION_GOAL: Record<TimeRange, number> = {
  W: 3, M: 12, "3M": 36, Y: 144, All: 144,
};

// ── Date helpers ─────────────────────────────────────────────────────────
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function isoWeekKey(d: Date): string {
  const m = mondayOf(d);
  return `${m.getFullYear()}-W${String(Math.floor(diffDays(m, new Date(m.getFullYear(), 0, 1)) / 7) + 1).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

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
    const wk = mondayOf(date);
    if (!buckets[key]) buckets[key] = { weekStart: wk, volume: 0 };
    for (const ex of entry.exercises) {
      for (const s of ex.sets) buckets[key].volume += s.weight * s.reps;
    }
  }
  return Object.values(buckets).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

// ── Headline tiles ──────────────────────────────────────────────────────
export interface HeadlineStats {
  est1RM: { value: number; delta: number; exercise: string };
  volumeWk: { value: number; delta: number };
  sessions: { value: number; goal: number };
  streak: { weeks: number; longest: number };
}

/** Best Epley estimate across any exercise within the filtered range. */
function topEstimate(f: FilteredHistory): { value: number; exercise: string } {
  let best = { value: 0, exercise: "—" };
  for (const { entry } of f.entries) {
    for (const ex of entry.exercises) {
      for (const s of ex.sets) {
        const e = epley(s.weight, s.reps);
        if (e > best.value) best = { value: e, exercise: ex.exercise };
      }
    }
  }
  return best;
}

function weeklyStreak(history: HistoryEntry[]): { weeks: number; longest: number } {
  if (history.length === 0) return { weeks: 0, longest: 0 };
  const weeks = new Set<string>();
  for (const e of history) {
    const d = parseISODate(e.date);
    if (d) weeks.add(isoWeekKey(d));
  }
  // Walk back from this week counting consecutive present weeks.
  let cur = mondayOf(new Date());
  let active = 0;
  while (weeks.has(isoWeekKey(cur))) {
    active += 1;
    cur = new Date(cur);
    cur.setDate(cur.getDate() - 7);
  }
  // Longest = scan all weeks chronologically.
  const sorted = [...weeks].sort();
  let longest = 0, run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    if (prev) {
      const [py, pw] = prev.slice(0, 4).match(/\d+/) ? [Number(prev.slice(0, 4)), Number(prev.slice(6))] : [0, 0];
      const [cy, cw] = [Number(k.slice(0, 4)), Number(k.slice(6))];
      const adj = (cy === py && cw === pw + 1) || (cy === py + 1 && pw === 52 && cw === 1);
      run = adj ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = k;
  }
  return { weeks: active, longest };
}

export function headlineStats(history: HistoryEntry[], f: FilteredHistory): HeadlineStats {
  // 1RM in range vs prior equal period.
  const top = topEstimate(f);
  const priorStart = new Date(f.rangeStart);
  priorStart.setDate(priorStart.getDate() - (RANGE_DAYS as Record<string, number>)["3M"]); // rough
  const priorF = {
    entries: history.flatMap((e) => {
      const d = parseISODate(e.date);
      return d && d < f.rangeStart && d >= priorStart ? [{ date: d, entry: e }] : [];
    }),
    rangeStart: priorStart,
    rangeEnd: f.rangeStart,
  };
  const priorTop = topEstimate(priorF);

  // Volume this week vs previous week.
  const wv = weeklyVolume({ entries: f.entries, rangeStart: f.rangeStart, rangeEnd: f.rangeEnd });
  const thisWk = wv.length > 0 ? wv[wv.length - 1].volume : 0;
  const prevWk = wv.length > 1 ? wv[wv.length - 2].volume : 0;

  return {
    est1RM:   { value: top.value, delta: top.value - priorTop.value, exercise: top.exercise },
    volumeWk: { value: thisWk, delta: thisWk - prevWk },
    sessions: { value: f.entries.length, goal: 0 /* set by caller */ },
    streak:   weeklyStreak(history),
  };
}

// ── Headline copy ───────────────────────────────────────────────────────
export function headlineCopy(s: HeadlineStats): string {
  if (s.sessions.value === 0)         return "Let's get started.";
  if (s.volumeWk.delta > 0)           return "You're trending up.";
  if (s.volumeWk.delta < 0)           return "Take a breath and reset.";
  return "Steady week — stay consistent.";
}

// ── Activity heatmap ────────────────────────────────────────────────────
export interface HeatCell { date: Date; count: number; }

/** Returns `weeks` columns × 7 rows of days, oldest column first. */
export function activityGrid(history: HistoryEntry[], weeks = 12): HeatCell[][] {
  const today = new Date();
  const todayMonday = mondayOf(today);
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
      const k = cellDate.toISOString().slice(0, 10);
      col.push({ date: cellDate, count: counts[k] ?? 0 });
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
    for (const e of history) {
      const d = parseISODate(e.date);
      if (!d) continue;
      for (const x of e.exercises) {
        if (x.exercise !== ex) continue;
        for (const s of x.sets) {
          const v = epley(s.weight, s.reps);
          if (v > bestVal) { bestVal = v; bestDate = d; }
        }
      }
    }
    // Prior best before the range.
    let priorBest = 0;
    for (const e of history) {
      const d = parseISODate(e.date);
      if (!d || d >= f.rangeStart) continue;
      for (const x of e.exercises) {
        if (x.exercise !== ex) continue;
        for (const s of x.sets) {
          const v = epley(s.weight, s.reps);
          if (v > priorBest) priorBest = v;
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
