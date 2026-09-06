// What the coach knows when it opens its mouth. Assembled on every say()
// from the athlete's history, the live session cursor, and the clock, then
// overridden by whatever the call site knows better (the rep just counted,
// the set that just finished, the PRs this session set).
//
// Everything here is read-only and cheap: history scans are bounded by the
// number of logged sessions, which is small.

import { getAthlete } from "@/data/athlete/athlete";
import { bestSetFor, lastSetFor } from "@/data/athlete/bestSet";
import { useSessionStore } from "@/stores/sessionStore";
import { isUnilateral } from "@/tracking/exercises/registry";
import { titleCase } from "@/lib/format";

export interface CoachContext {
  hour: number;
  /** Logged sessions, all time. */
  totalSessions: number;
  /** Distinct training days since Monday, including today. */
  sessionsThisWeek: number;
  /** Whole days since the last logged session; null when there is none. */
  daysSinceLast: number | null;

  exercise: string;
  exerciseLabel: string;
  weight: number;
  lastWeight: number | null;
  bestWeight: number | null;
  isNewWeight: boolean;
  isPrWeight: boolean;
  unilateral: boolean;
  side: "left" | "right";

  setIdx: number;
  setCount: number;
  isFirstSet: boolean;
  isLastSet: boolean;
  amrap: boolean;
  target: number;
  reps: number;
  remaining: number;
  short: number;

  workoutIdx: number;
  workoutCount: number;
  isLastExercise: boolean;
  nextExercise: string;
  nextExerciseLabel: string;
  remainingExercises: number;

  /** Session debrief (Complete only). */
  setsHit: number;
  setsMissed: number;
  prs: string[];
}

/** Raw inputs a call site may override before derivation. */
export type ContextOverrides = Partial<Pick<CoachContext,
  | "exercise" | "weight" | "target" | "amrap" | "reps" | "side"
  | "setIdx" | "workoutIdx" | "setsHit" | "setsMissed" | "prs"
>>;

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function historyStats(now: Date) {
  const history = getAthlete().history;
  const today = startOfDay(now);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = new Set<string>();
  let last: Date | null = null;
  for (const h of history) {
    const d = localDate(h.date);
    if (d >= monday) days.add(h.date);
    if (!last || d > last) last = d;
  }
  const daysSinceLast = last
    ? Math.round((today.getTime() - startOfDay(last).getTime()) / 86_400_000)
    : null;
  return { totalSessions: history.length, sessionsThisWeek: days.size, daysSinceLast };
}

export function buildContext(over: ContextOverrides = {}): CoachContext {
  const now = new Date();
  const { session, workoutIdx: storeWi, setIdx: storeSi } = useSessionStore.getState();

  const workoutIdx = over.workoutIdx ?? storeWi;
  const workout = session?.workouts[workoutIdx];
  const setIdx = over.setIdx ?? (workoutIdx === storeWi ? storeSi : 0);
  const row = workout?.sets[setIdx];

  const exercise = over.exercise ?? workout?.exercise ?? "";
  const weight = over.weight ?? ((row?.[1] as number | undefined) ?? 0);
  const target = over.target ?? ((row?.[0] as number | undefined) ?? 0);
  const amrap = over.amrap ?? Boolean(row?.[2]);
  const reps = over.reps ?? 0;

  const last = exercise ? lastSetFor(exercise) : null;
  const best = exercise ? bestSetFor(exercise) : null;
  const lastWeight = last?.weight ?? null;
  const bestWeight = best?.weight ?? null;

  const setCount = workout?.sets.length ?? 0;
  const workoutCount = session?.workouts.length ?? 0;
  const next = session?.workouts[workoutIdx + 1]?.exercise ?? "";

  return {
    hour: now.getHours(),
    ...historyStats(now),

    exercise,
    exerciseLabel: titleCase(exercise),
    weight,
    lastWeight,
    bestWeight,
    isNewWeight: weight > 0 && lastWeight !== null && weight > lastWeight,
    isPrWeight: weight > 0 && bestWeight !== null && weight > bestWeight,
    unilateral: isUnilateral(exercise),
    side: over.side ?? "right",

    setIdx,
    setCount,
    isFirstSet: setIdx === 0,
    isLastSet: setCount > 0 && setIdx === setCount - 1,
    amrap,
    target,
    reps,
    remaining: Math.max(0, target - reps),
    short: Math.max(0, target - reps),

    workoutIdx,
    workoutCount,
    isLastExercise: workoutCount > 0 && workoutIdx === workoutCount - 1,
    nextExercise: next,
    nextExerciseLabel: titleCase(next),
    remainingExercises: Math.max(0, workoutCount - workoutIdx - 1),

    setsHit: over.setsHit ?? 0,
    setsMissed: over.setsMissed ?? 0,
    prs: over.prs ?? [],
  };
}
