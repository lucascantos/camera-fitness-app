// Ported from: data/settings.py (legacy FitnessApp repo)
// Settings persisted to IndexedDB under key "settings".

import { kvGet, kvSet } from "@/data/db";

export type Theme = "fitpop" | "light" | "dark";

export interface Settings {
  musicVol: number;
  voiceVol: number;
  sfxVol: number;
  theme: Theme;
  activePlanId: string | null;
  restSeconds: number;
  autoRest: boolean;
  weightStep: number;
  favoriteExercises: string[];
  trainerEnabled: boolean;
  // ── Profile (used by Body tab and the top-nav avatar) ──
  name: string;
  initials: string;
  heightCm: number;
}

const DEFAULTS: Settings = {
  musicVol: 0.45,
  voiceVol: 0.85,
  sfxVol: 1.0,
  theme: "fitpop",
  activePlanId: null,
  restSeconds: 60,
  autoRest: true,
  weightStep: 1.0,
  favoriteExercises: [],
  trainerEnabled: true,
  name: "",
  initials: "ME",
  heightCm: 0,
};

let _settings: Settings = { ...DEFAULTS };

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGet<Partial<Settings>>("settings");
  if (stored) _settings = { ...DEFAULTS, ...stored };
  return _settings;
}

export function getSettings(): Settings {
  return _settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  _settings = { ..._settings, ...patch };
  await kvSet("settings", _settings);
  return _settings;
}
