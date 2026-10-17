// Session/streak/volume numbers for the Progress tab, plus the sentence above
// the tiles. Whether lifts are going up comes from ./liftVerdicts.

import type { HistoryEntry } from "@/data/athlete/athlete";
import { isoWeekKey, mondayOf, parseISODate } from "./dates";
import { weeklyVolume, type FilteredHistory } from "./progress";
import type { VerdictTally } from "./liftVerdicts";

export interface HeadlineStats {
  volumeWk: { value: number; delta: number };
  sessions: { value: number; goal: number };
  streak: { weeks: number; longest: number };
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
  // Volume this week vs previous week.
  const wv = weeklyVolume(f);
  const thisWk = wv.length > 0 ? wv[wv.length - 1].volume : 0;
  const prevWk = wv.length > 1 ? wv[wv.length - 2].volume : 0;

  return {
    volumeWk: { value: thisWk, delta: thisWk - prevWk },
    sessions: { value: f.entries.length, goal: 0 /* set by caller */ },
    streak:   weeklyStreak(history),
  };
}

export function headlineCopy(s: HeadlineStats, t: VerdictTally): string {
  if (s.sessions.value === 0)                  return "Let's get started.";
  if (t.liftsUp > 0 && t.liftsUp >= t.liftsDipped) return "You're getting stronger.";
  if (t.liftsDipped > t.liftsUp)               return "Take a breath and reset.";
  return "Steady — stay consistent.";
}
