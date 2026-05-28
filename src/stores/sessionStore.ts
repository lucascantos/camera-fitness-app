import { create } from "zustand";
import type { Session } from "@/data/plans/plans";

export type SceneName = "home" | "training" | "rest" | "complete" | "stats" | "settings";

interface SessionState {
  scene: SceneName;
  session: Session | null;
  workoutIdx: number;
  setIdx: number;
  goTo(scene: SceneName): void;
  startSession(session: Session): void;
  setCursor(workoutIdx: number, setIdx: number): void;
  endSession(): void;
}

export const useSessionStore = create<SessionState>((set) => ({
  scene: "home",
  session: null,
  workoutIdx: 0,
  setIdx: 0,
  goTo: (scene) => set({ scene }),
  startSession: (session) =>
    set({ session, workoutIdx: 0, setIdx: 0, scene: "training" }),
  setCursor: (workoutIdx, setIdx) => set({ workoutIdx, setIdx }),
  endSession: () => set({ session: null, scene: "home" }),
}));
