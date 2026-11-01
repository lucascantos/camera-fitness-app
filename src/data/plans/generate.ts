// The plan onboarding promises ("I've got your workout plan ready"), built
// from two answers: days a week pick the split (which exercises go on which
// day), the goal picks the style (sets, reps, rest). Plans use any equipment;
// only the calibration session is dumbbell-only. See
// docs/guided-mode-design.md §5.
//
// No weight is prescribed (0): these are new exercises for the athlete, so
// the first set's weight is chosen on the setup step and Linear progression
// takes it from there (see linear.ts, seeding from the first logged weight).

import { updateSettings, type Goal } from "@/data/settings/settings";
import { loadPlans, savePlans, type Plan, type PrescribedSet, type WorkoutDay } from "./plans";

type Role = "main" | "accessory";
type DayTemplate = { name: string; exercises: [string, Role][] };

const SPLITS: Record<number, DayTemplate[]> = {
  // Full body, alternating A / B.
  3: [
    { name: "A", exercises: [["squat", "main"], ["bench press", "main"], ["barbell row", "main"], ["bicep curl", "accessory"]] },
    { name: "B", exercises: [["deadlift", "main"], ["overhead press", "main"], ["split squat", "accessory"], ["lateral raise", "accessory"]] },
  ],
  // Upper / Lower, twice each.
  4: [
    { name: "Upper A", exercises: [["bench press", "main"], ["barbell row", "main"], ["overhead press", "accessory"], ["bicep curl", "accessory"]] },
    { name: "Lower A", exercises: [["squat", "main"], ["split squat", "accessory"], ["dumbbell deadlift", "accessory"]] },
    { name: "Upper B", exercises: [["overhead press", "main"], ["dumbbell row", "main"], ["dumbbell press", "accessory"], ["skull crusher", "accessory"]] },
    { name: "Lower B", exercises: [["deadlift", "main"], ["front squat", "accessory"], ["split squat", "accessory"]] },
  ],
  // Upper / Lower / Push / Pull / Legs.
  5: [
    { name: "Upper", exercises: [["dumbbell press", "main"], ["dumbbell row", "main"], ["dumbbell overhead press", "accessory"], ["bicep curl", "accessory"]] },
    { name: "Lower", exercises: [["squat", "main"], ["dumbbell deadlift", "accessory"], ["split squat", "accessory"]] },
    { name: "Push", exercises: [["bench press", "main"], ["overhead press", "main"], ["dumbbell fly", "accessory"], ["skull crusher", "accessory"]] },
    { name: "Pull", exercises: [["deadlift", "main"], ["barbell row", "main"], ["hammer curl", "accessory"]] },
    { name: "Legs", exercises: [["front squat", "main"], ["split squat", "accessory"], ["dumbbell squat", "accessory"]] },
  ],
};

interface Style { label: string; main: [number, number]; accessory: [number, number]; restSeconds: number }

// [sets, reps] per role, and the rest between sets.
const STYLES: Record<Goal, Style> = {
  strength:    { label: "Strength",    main: [3, 6],  accessory: [3, 10], restSeconds: 120 },
  weight_loss: { label: "Weight loss", main: [3, 12], accessory: [3, 15], restSeconds: 60 },
  health:      { label: "Health",      main: [3, 10], accessory: [3, 12], restSeconds: 90 },
};

/** Id prefix of generated plans, so they can be told apart from custom ones. */
export const GENERATED_PREFIX = "guided-";

export function generatePlan(goal: Goal, daysPerWeek: number): { plan: Plan; restSeconds: number } {
  const split = SPLITS[daysPerWeek] ?? SPLITS[3];
  const style = STYLES[goal];
  const workouts: WorkoutDay[] = split.map((day) => ({
    name: day.name,
    exercises: day.exercises.map(([exercise, role]) => {
      const [sets, reps] = style[role];
      return { exercise, sets: Array.from({ length: sets }, () => [reps, 0, false] as PrescribedSet) };
    }),
  }));
  return {
    plan: {
      id: `${GENERATED_PREFIX}${goal}-${daysPerWeek}-${Date.now().toString(36)}`,
      name: `${style.label} · ${daysPerWeek} days`,
      progression: "linear",
      progressionParams: {},
      workouts,
    },
    restSeconds: style.restSeconds,
  };
}

/**
 * Build the plan for these answers, add it to the plan list and make it the
 * active one, with the goal's rest time. Remembered as settings.guidedPlanId
 * so it's only ever generated once (deleting it doesn't bring it back).
 */
export async function installGeneratedPlan(goal: Goal, daysPerWeek: number): Promise<Plan> {
  const { plan, restSeconds } = generatePlan(goal, daysPerWeek);
  const plans = await loadPlans();
  await savePlans([...plans, plan]);
  await updateSettings({ activePlanId: plan.id, guidedPlanId: plan.id, restSeconds });
  return plan;
}
