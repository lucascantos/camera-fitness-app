// Ported from: data/settings.py (legacy FitnessApp repo)
// Settings persisted to IndexedDB under key "settings".

import { kvGet, kvSet } from "@/data/db";
import { POSE_STYLES, type PoseStyle } from "@/tracking/poseRenderer";

export type Theme = "fitpop" | "dark";

export interface Settings {
  masterVol: number;
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
  // Pose overlay display style (skeleton / smooth / spring / aura / polygons).
  poseStyle: PoseStyle;
  // ── Profile (used by Body tab and the top-nav avatar) ──
  name: string;
  initials: string;
  heightCm: number;
}

const DEFAULTS: Settings = {
  masterVol: 1.0,
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
  poseStyle: "spring",
  name: "",
  initials: "ME",
  heightCm: 0,
};

let _settings: Settings = { ...DEFAULTS };

/** Apply the current theme by toggling the .dark class on <html>. */
export function applyTheme(theme: Theme = _settings.theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGet<Partial<Settings>>("settings");
  if (stored) _settings = { ...DEFAULTS, ...stored };
  // Reset removed/unknown pose styles (e.g. an old "lerp"/"polygons" value).
  if (!POSE_STYLES.some((p) => p.id === _settings.poseStyle)) {
    _settings.poseStyle = DEFAULTS.poseStyle;
  }
  // Reset removed/unknown themes (e.g. an old "light" value).
  if (_settings.theme !== "fitpop" && _settings.theme !== "dark") {
    _settings.theme = DEFAULTS.theme;
  }
  applyTheme();
  return _settings;
}

export function getSettings(): Settings {
  return _settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  _settings = { ..._settings, ...patch };
  if ("theme" in patch) applyTheme();
  await kvSet("settings", _settings);
  return _settings;
}
