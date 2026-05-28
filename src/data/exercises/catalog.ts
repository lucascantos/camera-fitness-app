// Single source of truth for exercise metadata: muscle group, equipment,
// and which exercises have a camera tracker today.

import { TRACKED_EXERCISES } from "@/tracking/exercises/registry";

export type Muscle =
  | "Biceps" | "Triceps" | "Chest" | "Shoulders"
  | "Back" | "Quads" | "Glutes" | "Core";

export type Equipment = "bodyweight" | "dumbbell" | "barbell" | "cable";

export interface ExerciseMeta {
  name: string;
  primary: Muscle;
  equipment: Equipment;
}

export const EXERCISE_CATALOG: ExerciseMeta[] = [
  { name: "bicep curl",     primary: "Biceps",    equipment: "dumbbell" },
  { name: "push ups",       primary: "Chest",     equipment: "bodyweight" },
  { name: "squat",          primary: "Quads",     equipment: "barbell" },
  { name: "lateral raise",  primary: "Shoulders", equipment: "dumbbell" },
  { name: "deadlift",       primary: "Back",      equipment: "barbell" },
  { name: "bench press",    primary: "Chest",     equipment: "barbell" },
  { name: "overhead press", primary: "Shoulders", equipment: "barbell" },
  { name: "barbell row",    primary: "Back",      equipment: "barbell" },
];

const META_BY_NAME = new Map(EXERCISE_CATALOG.map((m) => [m.name, m]));

export function exerciseMeta(name: string): ExerciseMeta | undefined {
  return META_BY_NAME.get(name);
}

export function isTracked(name: string): boolean {
  return (TRACKED_EXERCISES as readonly string[]).includes(name);
}

// Stable accent colour per muscle, used for the numbered badge on each row.
export const MUSCLE_COLORS: Record<Muscle, string> = {
  Biceps:    "#FFD2D6",
  Triceps:   "#FFE3C7",
  Chest:     "#CCE3FF",
  Shoulders: "#FFD7E2",
  Back:      "#D2E8FF",
  Quads:     "#D7F0DC",
  Glutes:    "#F3D7FF",
  Core:      "#FFF1C0",
};
