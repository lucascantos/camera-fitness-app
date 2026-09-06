// Holds the currently-spoken trainer line. Centralised so any scene
// can call say() and whichever surface is mounted (TrainerPanel,
// Training's status bar, etc.) picks it up.

import { create } from "zustand";

interface TrainerState {
  text: string;
  /** Monotonic counter that ticks on every say() so the HUD can
   *  re-fire its fade timer even when the same line repeats. */
  tick: number;
  /** When the current line was posted (ms epoch), so a scene can tell a
   *  line said a moment ago from one left over from the previous scene. */
  at: number;
}

export const useTrainerStore = create<TrainerState>(() => ({
  text: "",
  tick: 0,
  at: 0,
}));

export function postLine(text: string): void {
  useTrainerStore.setState((s) => ({ text, tick: s.tick + 1, at: Date.now() }));
}

export function clearLine(): void {
  useTrainerStore.setState((s) => ({ text: "", tick: s.tick + 1 }));
}
