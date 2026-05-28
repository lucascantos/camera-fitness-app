// Ported from: data/plans.py + data/workout_plans.py (legacy FitnessApp repo)
// Plan + WorkoutDay + Session schema.

export type PrescribedSet = [reps: number, weight: number, isAmrap: boolean];
export interface SetActuals { reps: number; weight: number; }
export type SessionSet = [...PrescribedSet, SetActuals?];

export interface WorkoutDay {
  name: string;
  exercises: { exercise: string; sets: PrescribedSet[] }[];
}

export interface Plan {
  id: string;
  name: string;
  workouts: WorkoutDay[];
  progression: string;
  progressionParams: Record<string, unknown>;
}

export interface Session {
  sessionId: string;
  day: string | number;
  workouts: { exercise: string; sets: SessionSet[] }[];
  planId?: string;
  workoutDayIndex?: number;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

// Two default plans so the app has something to run on first launch.
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "quickstart-bodyweight",
    name: "Quickstart — Bodyweight",
    progression: "linear",
    progressionParams: {},
    workouts: [
      {
        name: "Full Body A",
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
          { exercise: "squat",        sets: Array.from({ length: 5 }, () => [5, 60, false]) },
          { exercise: "bench press",  sets: Array.from({ length: 5 }, () => [5, 50, false]) },
          { exercise: "barbell row",  sets: Array.from({ length: 5 }, () => [5, 40, false]) },
        ],
      },
      {
        name: "B",
        exercises: [
          { exercise: "squat",          sets: Array.from({ length: 5 }, () => [5, 60, false]) },
          { exercise: "overhead press", sets: Array.from({ length: 5 }, () => [5, 30, false]) },
          { exercise: "deadlift",       sets: [[5, 70, false]] },
        ],
      },
    ],
  },
];
