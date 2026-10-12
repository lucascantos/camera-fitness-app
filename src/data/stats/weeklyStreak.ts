// The weekly streak on Home: consecutive weeks (Mon–Sun) in which the athlete
// trained at least as often as their weekly goal. Days are counted, not
// history entries, so three Quick Start exercises on one day are one workout.
//
// The current week can only add to the streak, never break it: until Sunday
// is over there is still time to hit the goal. A missed week breaks it the
// moment the next week starts.

import type { HistoryEntry } from "@/data/athlete/athlete";
import { isoWeekKey, mondayOf, parseISODate } from "./dates";

export interface WeeklyStreak {
  /** Consecutive weeks at goal, including this week once it's met. */
  weeks: number;
  /** Distinct training days so far this week. */
  thisWeek: number;
  goal: number;
}

/** Distinct training days per ISO week key. */
function daysPerWeek(history: HistoryEntry[]): Map<string, number> {
  const days = new Map<string, Set<string>>();
  for (const e of history) {
    const d = parseISODate(e.date);
    if (!d) continue;
    const key = isoWeekKey(d);
    const set = days.get(key) ?? new Set<string>();
    set.add(e.date);
    days.set(key, set);
  }
  return new Map([...days].map(([k, s]) => [k, s.size]));
}

export function weeklyStreak(
  history: HistoryEntry[],
  goal: number,
  today: Date = new Date(),
): WeeklyStreak {
  goal = Math.max(1, goal);   // a goal of 0 would never break the walk back
  const perWeek = daysPerWeek(history);
  const thisMonday = mondayOf(today);
  const thisWeek = perWeek.get(isoWeekKey(thisMonday)) ?? 0;

  // Walk back from last week while each week met the goal.
  let weeks = 0;
  const cur = new Date(thisMonday);
  for (;;) {
    cur.setDate(cur.getDate() - 7);
    if ((perWeek.get(isoWeekKey(cur)) ?? 0) < goal) break;
    weeks++;
  }
  if (thisWeek >= goal) weeks++;

  return { weeks, thisWeek, goal };
}
