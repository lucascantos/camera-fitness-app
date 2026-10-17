// The Progress tab's answer to "am I getting stronger?", built from the same
// verdict the Session Summary shows (./verdict). Two views per exercise:
//
//   - Session verdicts: each session against the one before it, as dots.
//   - Range verdict: the latest session against the last one before the
//     range began (or, with nothing earlier, the first one inside it).
//
// History is stored oldest first, so "previous" is just the prior entry.

import type { HistoryEntry, HistorySet } from "@/data/athlete/athlete";
import type { FilteredHistory } from "./progress";
import { parseISODate } from "./dates";
import { judge, type Verdict, type VerdictKind } from "./verdict";

export interface SessionDot {
  date: Date;
  /** Null for the first time the lift was ever done — nothing to beat. */
  kind: VerdictKind | null;
  reason: string;
}

export interface LiftRow {
  exercise: string;
  /** Latest session vs the baseline; null with a single session and no history. */
  verdict: Verdict | null;
  /** Date of the session the range verdict compares against. */
  since: Date | null;
  /** One per session in range, oldest first. */
  dots: SessionDot[];
}

export interface VerdictTally {
  /** Sessions in range that beat the session before them. */
  progressed: number;
  /** Sessions in range with a verdict at all. */
  judged: number;
  liftsUp: number;
  liftsDipped: number;
  lifts: number;
}

interface Done { date: Date; sets: HistorySet[] }

/** Every session that included each exercise, oldest first. */
function sessionsByExercise(history: HistoryEntry[]): Map<string, Done[]> {
  const out = new Map<string, Done[]>();
  for (const e of history) {
    const date = parseISODate(e.date);
    if (!date) continue;
    for (const ex of e.exercises) {
      if (!ex.sets.some((s) => s.reps > 0)) continue;
      const list = out.get(ex.exercise) ?? [];
      list.push({ date, sets: ex.sets });
      out.set(ex.exercise, list);
    }
  }
  return out;
}

export function liftRows(history: HistoryEntry[], f: FilteredHistory): LiftRow[] {
  const rows: (LiftRow & { latest: number })[] = [];
  for (const [exercise, all] of sessionsByExercise(history)) {
    const first = all.findIndex((d) => d.date >= f.rangeStart && d.date <= f.rangeEnd);
    if (first < 0) continue;   // not trained in this range
    const inRange = all.slice(first).filter((d) => d.date <= f.rangeEnd);

    const dots: SessionDot[] = inRange.map((d, i) => {
      const prev = all[first + i - 1];
      const v = prev ? judge(d.sets, prev.sets) : null;
      return { date: d.date, kind: v?.kind ?? null, reason: v?.reason ?? "First time" };
    });

    const latest = inRange[inRange.length - 1];
    const base = first > 0 ? all[first - 1] : inRange.length > 1 ? inRange[0] : null;
    rows.push({
      exercise,
      verdict: base ? judge(latest.sets, base.sets) : null,
      since: base?.date ?? null,
      dots,
      latest: latest.date.getTime(),
    });
  }
  // Most recently trained first: what you're working on now leads.
  rows.sort((a, b) => b.latest - a.latest);
  return rows.map(({ latest: _, ...row }) => row);
}

export function tallyVerdicts(rows: LiftRow[]): VerdictTally {
  let progressed = 0;
  let judged = 0;
  for (const r of rows) {
    for (const d of r.dots) {
      if (d.kind === null) continue;
      judged++;
      if (d.kind === "progress") progressed++;
    }
  }
  return {
    progressed,
    judged,
    liftsUp: rows.filter((r) => r.verdict?.kind === "progress").length,
    liftsDipped: rows.filter((r) => r.verdict?.kind === "below").length,
    lifts: rows.length,
  };
}
