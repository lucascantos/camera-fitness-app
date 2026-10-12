// Date helpers for the Home screen's week strip.

import type { HistoryEntry } from "@/data/athlete/athlete";

export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Returns 0..6 with Monday=0, matching the legacy week-dot order. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Parse a "YYYY-MM-DD" history date as a local Date. */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Set of weekday indices (Monday-based) that have a session this ISO week. */
export function weekCompletedDays(history: HistoryEntry[]): Set<number> {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayIndex(today));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const out = new Set<number>();
  for (const entry of history) {
    const d = parseISODate(entry.date);
    if (!d) continue;
    if (d >= monday && d <= sunday) out.add(mondayIndex(d));
  }
  return out;
}
