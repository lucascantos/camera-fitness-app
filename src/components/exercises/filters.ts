// The filter/sort model behind the exercise library, shared by the list and
// the filter sheet.

import type { Equipment, MuscleGroup } from "@/data/exercises/catalog";
import type { BestSet } from "@/data/athlete/bestSet";

export type SortMode = "az" | "best" | "favorite";

export interface Filters {
  muscle: MuscleGroup | "All";
  equip: Equipment | "any";
  sort: SortMode;
}

export const DEFAULT_FILTERS: Filters = { muscle: "All", equip: "any", sort: "az" };

export const EQUIPMENT_FILTERS: { id: Equipment | "any"; label: string }[] = [
  { id: "any",         label: "Any equip"  },
  { id: "bodyweight",  label: "Bodyweight" },
  { id: "dumbbell",    label: "Dumbbell"   },
  { id: "barbell",     label: "Barbell"    },
  { id: "cable",       label: "Cable"      },
];

export const SORT_LABEL: Record<SortMode, string> = {
  az:       "A–Z",
  best:     "Best",
  favorite: "Favourites",
};

export const SORT_ORDER: SortMode[] = ["az", "best", "favorite"];

export function isFiltering(f: Filters): boolean {
  return f.muscle !== "All" || f.equip !== "any" || f.sort !== "az";
}

/** One-line summary of what's narrowing the list, for the Clear button. */
export function describeFilters(f: Filters): string {
  return [
    f.muscle !== "All" ? f.muscle : null,
    f.equip !== "any" ? EQUIPMENT_FILTERS.find((e) => e.id === f.equip)?.label : null,
    f.sort !== "az" ? SORT_LABEL[f.sort] : null,
  ].filter(Boolean).join(" · ");
}

export function weightScore(b: BestSet | null): number {
  if (!b) return -1;
  // Bodyweight rows still rank by reps so "no record" stays at the bottom.
  return b.weight === 0 ? b.reps * 0.1 : b.weight * 1000 + b.reps;
}
