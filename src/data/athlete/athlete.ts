// Ported from: data/athlete.py (legacy FitnessApp repo)
// Stores coins, session history, one-rep-max table, and per-plan progression state.

import { kvGet, kvSet } from "@/data/db";

export interface HistorySet {
  reps: number;
  weight: number;
}

export interface HistoryExercise {
  exercise: string;
  sets: HistorySet[];
}

export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  exercises: HistoryExercise[];
  coinsEarned: number;
}

export interface Athlete {
  coins: number;
  history: HistoryEntry[];
  orm: Record<string, number>;
  progress: Record<string, any>;
  awardedSessionIds: string[];
}

const DEFAULT_ORM: Record<string, number> = {
  squat:            80,
  "bench press":    70,
  deadlift:         80,
  "overhead press": 25,
  "barbell row":    25,
};

const DEFAULTS: Athlete = {
  coins: 0,
  history: [],
  orm: { ...DEFAULT_ORM },
  progress: {},
  awardedSessionIds: [],
};

let _athlete: Athlete = { ...DEFAULTS };

export async function loadAthlete(): Promise<Athlete> {
  const stored = await kvGet<Partial<Athlete>>("athlete");
  if (stored) _athlete = { ...DEFAULTS, ...stored };
  return _athlete;
}

export function getAthlete(): Athlete {
  return _athlete;
}

export async function saveAthlete(): Promise<void> {
  await kvSet("athlete", _athlete);
}

export async function awardSession(
  sessionId: string,
  exercises: HistoryExercise[],
  coinsEarned: number,
): Promise<void> {
  if (_athlete.awardedSessionIds.includes(sessionId)) return;
  _athlete.coins += coinsEarned;
  _athlete.history.push({
    date: new Date().toISOString().slice(0, 10),
    exercises,
    coinsEarned,
  });
  _athlete.awardedSessionIds.push(sessionId);
  await saveAthlete();
}
