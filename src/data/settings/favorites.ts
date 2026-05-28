// Thin helpers around settings.favoriteExercises.

import { getSettings, updateSettings } from "@/data/settings/settings";

export function isFavorite(name: string): boolean {
  return getSettings().favoriteExercises.includes(name);
}

export async function toggleFavorite(name: string): Promise<boolean> {
  const cur = getSettings().favoriteExercises;
  const next = cur.includes(name)
    ? cur.filter((x) => x !== name)
    : [...cur, name];
  await updateSettings({ favoriteExercises: next });
  return next.includes(name);
}

export function favoriteCount(): number {
  return getSettings().favoriteExercises.length;
}
