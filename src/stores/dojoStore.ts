import { create } from "zustand";
import {
  getDojo, saveDojo, awardPower as doAwardPower,
  computeCoins, isSessionComplete, CHEER_BONUS, computeLevel,
} from "@/data/dojo/dojo";
import { getAthlete, saveAthlete } from "@/data/athlete/athlete";
import type { CharacterId, ActiveSession } from "@/data/dojo/types";

interface DojoStore {
  power: number;
  activeSession: ActiveSession | null;
  hydrate(): void;
  sendToTrain(id: CharacterId): void;
  stopTraining(): void;
  cheer(): void;
  collectRewards(): Promise<void>;
  addPower(seconds: number): Promise<void>;
}

export const useDojoStore = create<DojoStore>((set) => ({
  power: 0,
  activeSession: null,

  hydrate: () => {
    const d = getDojo();
    set({ power: d.power, activeSession: d.activeSession });
  },

  sendToTrain: (id) => {
    const d = getDojo();
    if (d.power <= 0 || d.activeSession) return;
    d.activeSession = {
      characterId: id,
      startedAt: Date.now(),
      powerCommitted: d.power,
      multiplier: 1.0,
    };
    d.power = 0;
    void saveDojo();
    set({ power: 0, activeSession: { ...d.activeSession } });
  },

  stopTraining: () => {
    getDojo().activeSession = null;
    void saveDojo();
    set({ activeSession: null });
  },

  cheer: () => {
    const s = getDojo().activeSession;
    if (!s) return;
    s.multiplier = Math.round((s.multiplier + CHEER_BONUS) * 10) / 10;
    void saveDojo();
    set({ activeSession: { ...s } });
  },

  collectRewards: async () => {
    const d = getDojo();
    const s = d.activeSession;
    if (!s || !isSessionComplete(s)) return;
    const coins = computeCoins(s);
    getAthlete().coins += coins;
    await saveAthlete();
    const elapsed = Math.min((Date.now() - s.startedAt) / 1000, s.powerCommitted);
    const prog = d.progress[s.characterId];
    prog.totalSeconds += Math.round(elapsed);
    prog.level = computeLevel(prog.totalSeconds);
    d.activeSession = null;
    await saveDojo();
    set({ activeSession: null });
  },

  addPower: async (seconds) => {
    doAwardPower(seconds);
    await saveDojo();
    set({ power: getDojo().power });
  },
}));
