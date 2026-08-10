import type { HistoryEntry } from "@/data/athlete/athlete";

/** Keep 0.5kg steps from accumulating float noise (0.30000000000000004). */
export function round(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}

export function blankEntry(): HistoryEntry {
  return {
    date: new Date().toISOString().slice(0, 10),
    exercises: [],
    coinsEarned: 0,
  };
}

export function entryVolume(e: HistoryEntry): number {
  return e.exercises.reduce(
    (vol, ex) => vol + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  );
}

// Parse a YYYY-MM-DD string without timezone drift and format it nicely.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}
