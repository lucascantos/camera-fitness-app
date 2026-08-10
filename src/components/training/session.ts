// Live-session mutations made from the training screen.

import type { Session } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";

/** Store what the athlete actually did for this set (reps + working weight). */
export function recordActuals(
  session: Session, wi: number, si: number,
  actuals: { reps: number; weight: number },
) {
  session.workouts[wi].sets[si][3] = actuals;
  useSessionStore.setState({ session: { ...session } });
}

export function mutateWeight(
  session: Session, wi: number, si: number, fn: (v: number) => number,
) {
  const sets = session.workouts[wi].sets;
  const prev = sets[si][1];
  const next = fn(prev);
  sets[si][1] = next;
  // Weight changes carry forward to later sets that shared this set's previous
  // load, so dialing in the weight on set 1 of a same-weight scheme (e.g. a
  // linear 3×10 that started at bodyweight) applies to every following set
  // instead of leaving them at the old value. Sets that intentionally differ
  // (5/3/1's 65/75/85 %, BBB back-off sets) keep their own weights.
  for (let i = si + 1; i < sets.length; i++) {
    if (sets[i][1] === prev) sets[i][1] = next;
  }
  useSessionStore.setState({ session: { ...session } });
}
