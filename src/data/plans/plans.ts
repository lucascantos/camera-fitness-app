// Ported from: data/plans.py + data/workout_plans.py (legacy FitnessApp repo)
// Plan + WorkoutDay + Session schema, plus IndexedDB persistence.

import { kvGet, kvSet } from "@/data/db";
import { getSettings, updateSettings } from "@/data/settings/settings";

export type PrescribedSet = [reps: number, weight: number, isAmrap: boolean];
export interface SetActuals { reps: number; weight: number; }
export type SessionSet = [...PrescribedSet, SetActuals?];

export interface WorkoutExercise {
  exercise: string;
  sets: PrescribedSet[];
}

export interface WorkoutDay {
  name: string;
  exercises: WorkoutExercise[];
}

export type ProgressionId = "linear" | "five_three_one" | "volume";

export interface Plan {
  id: string;
  name: string;
  workouts: WorkoutDay[];
  progression: ProgressionId;
  progressionParams: Record<string, unknown>;
}

export interface Session {
  sessionId: string;
  day: string | number;
  workouts: { exercise: string; sets: SessionSet[] }[];
  planId?: string;
  workoutDayIndex?: number;
}

// ── id helpers ──────────────────────────────────────────────────────────────
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function slug(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (base || "plan") + "-" + uuid().slice(0, 6);
}

// ── session builder ─────────────────────────────────────────────────────────
export function makeSession(
  day: string | number,
  exercisesSets: [string, PrescribedSet[]][],
  extras: { planId?: string; workoutDayIndex?: number } = {},
): Session {
  return {
    sessionId: uuid(),
    day,
    workouts: exercisesSets.map(([exercise, sets]) => ({
      exercise,
      sets: sets.map((s) => [...s] as SessionSet),
    })),
    ...extras,
  };
}

// ── default seed plans ──────────────────────────────────────────────────────
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "quickstart-bodyweight",
    name: "Quickstart — Bodyweight",
    progression: "linear",
    progressionParams: {},
    workouts: [
      {
        name: "A",
        exercises: [
          { exercise: "push ups",   sets: [[10, 0, false], [10, 0, false], [10, 0, false]] },
          { exercise: "squat",      sets: [[12, 0, false], [12, 0, false], [12, 0, false]] },
          { exercise: "bicep curl", sets: [[10, 0, false], [10, 0, false], [10, 0, false]] },
        ],
      },
    ],
  },
  {
    id: "stronglifts-5x5",
    name: "StrongLifts 5×5",
    progression: "linear",
    progressionParams: {},
    workouts: [
      {
        name: "A",
        exercises: [
          { exercise: "squat",        sets: Array.from({ length: 5 }, () => [5, 60, false] as PrescribedSet) },
          { exercise: "bench press",  sets: Array.from({ length: 5 }, () => [5, 50, false] as PrescribedSet) },
          { exercise: "barbell row",  sets: Array.from({ length: 5 }, () => [5, 40, false] as PrescribedSet) },
        ],
      },
      {
        name: "B",
        exercises: [
          { exercise: "squat",          sets: Array.from({ length: 5 }, () => [5, 60, false] as PrescribedSet) },
          { exercise: "overhead press", sets: Array.from({ length: 5 }, () => [5, 30, false] as PrescribedSet) },
          { exercise: "deadlift",       sets: [[5, 70, false]] },
        ],
      },
    ],
  },
];

// ── persistence ─────────────────────────────────────────────────────────────
let _cache: Plan[] | null = null;

export async function loadPlans(): Promise<Plan[]> {
  if (_cache) return _cache;
  const stored = await kvGet<Plan[]>("plans");
  _cache = stored && stored.length > 0
    ? stored
    : DEFAULT_PLANS.map((p) => structuredClone(p));
  return _cache;
}

export async function savePlans(plans: Plan[]): Promise<void> {
  _cache = plans;
  await kvSet("plans", plans);
}

export function getCachedPlans(): Plan[] {
  return _cache ?? [];
}

export async function newPlan(name = "New plan"): Promise<Plan> {
  const p: Plan = {
    id: slug(name),
    name,
    progression: "linear",
    progressionParams: {},
    workouts: [{ name: "A", exercises: [] }],
  };
  const plans = await loadPlans();
  const next = [...plans, p];
  await savePlans(next);
  return p;
}

export async function deletePlan(id: string): Promise<Plan[]> {
  const plans = await loadPlans();
  const next = plans.filter((p) => p.id !== id);
  await savePlans(next);
  if (getSettings().activePlanId === id) {
    await updateSettings({ activePlanId: next[0]?.id ?? null });
  }
  return next;
}

export async function setActivePlan(id: string | null): Promise<void> {
  await updateSettings({ activePlanId: id });
}

export function nextDayName(workouts: WorkoutDay[]): string {
  // Alphabetic: A, B, …, Z, then AA, AB, …
  const used = new Set(workouts.map((w) => w.name));
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i);
    if (!used.has(c)) return c;
  }
  return `Day ${workouts.length + 1}`;
}
