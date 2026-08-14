import { kvGet, kvSet } from "@/data/db";
import type { CharacterId, Character, DojoState, ActiveSession } from "./types";

export const POWER_CAP = 48 * 3600;  // 172 800 s
export const COIN_RATE = 1 / 60;     // 1 coin per minute
export const CHEER_BONUS = 0.1;

export const CHARACTERS: Record<CharacterId, Character> = {
  cael: { id: "cael", name: "Cael", species: "Elf",   gender: "boy"  },
  bryn: { id: "bryn", name: "Bryn", species: "Dwarf", gender: "girl" },
};

// Total training seconds needed to reach each level (index 0 = level 1)
const LEVEL_THRESHOLDS = [0, 1_800, 5_400, 10_800, 21_600, 43_200, 86_400];

export function computeLevel(totalSeconds: number): number {
  let lv = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (totalSeconds >= t) lv++;
  }
  return Math.min(lv - 1, LEVEL_THRESHOLDS.length);
}

function defaultState(): DojoState {
  return {
    power: 0,
    progress: {
      cael: { level: 1, totalSeconds: 0 },
      bryn: { level: 1, totalSeconds: 0 },
    },
    activeSession: null,
  };
}

const KEY = "dojo";
let _state: DojoState = defaultState();

export async function loadDojo(): Promise<DojoState> {
  const saved = await kvGet<DojoState>(KEY);
  _state = saved ?? defaultState();
  return _state;
}

export function getDojo(): DojoState { return _state; }

export async function saveDojo(): Promise<void> {
  await kvSet(KEY, _state);
}

export function awardPower(seconds: number): void {
  _state.power = Math.min(_state.power + Math.round(seconds), POWER_CAP);
}

export function computeCoins(session: ActiveSession): number {
  const elapsed = Math.min(
    (Date.now() - session.startedAt) / 1000,
    session.powerCommitted,
  );
  return Math.floor(COIN_RATE * elapsed * session.multiplier);
}

export function isSessionComplete(session: ActiveSession): boolean {
  return Date.now() - session.startedAt >= session.powerCommitted * 1000;
}

export function formatPower(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
