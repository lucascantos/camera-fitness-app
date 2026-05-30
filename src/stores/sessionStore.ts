import { create } from "zustand";
import type { Session } from "@/data/plans/plans";
import { kvGet, kvSet } from "@/data/db";

export type SceneName =
  | "home"
  | "plans"
  | "exercises"
  | "stats"
  | "settings"
  | "training"
  | "rest"
  | "complete";

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

const SESSION_KEY = "activeSession";

interface PersistedSession {
  session: Session;
  workoutIdx: number;
  setIdx: number;
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

// Persist session state to IndexedDB whenever it changes.
useSessionStore.subscribe((state) => {
  if (state.session) {
    const data: PersistedSession = {
      session: state.session,
      workoutIdx: state.workoutIdx,
      setIdx: state.setIdx,
    };
    void kvSet(SESSION_KEY, data);
  } else {
    void kvSet(SESSION_KEY, null);
  }
});

/** Load a persisted session from IndexedDB. Returns it if found, or null. */
export async function loadPersistedSession(): Promise<PersistedSession | null> {
  const data = await kvGet<PersistedSession | null>(SESSION_KEY);
  if (data?.session) {
    // Hydrate into the store but stay on "home" — the popup handles navigation.
    useSessionStore.setState({
      session: data.session,
      workoutIdx: data.workoutIdx,
      setIdx: data.setIdx,
    });
    return data;
  }
  return null;
}
