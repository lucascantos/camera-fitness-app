// Ported from: scenes/complete.py (legacy FitnessApp repo)
//
// Writes a finished session into history (with its coins) and lets the plan's
// progression strategy update working weights / training max / week for next
// time. awardSession() is idempotent per session id, so a remount is safe.

import { useEffect } from "react";
import type { Session, Plan } from "@/data/plans/plans";
import { loadPlans } from "@/data/plans/plans";
import { awardSession, getAthlete, saveAthlete } from "@/data/athlete/athlete";
import { getStrategy } from "@/data/progressions";

export function useAwardSession(session: Session | null): void {
  useEffect(() => {
    if (!session) return;

    const exercises = session.workouts.map((w) => ({
      exercise: w.exercise,
      sets: w.sets.map((s) => s[3] ?? { reps: s[0], weight: s[1] }),
    }));
    let coins = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) coins += s.reps + 2;   // 1 per rep, 2 per set
    }

    (async () => {
      await awardSession(session.sessionId, exercises, coins);

      const { planId, workoutDayIndex: wdIdx } = session;
      if (!planId || wdIdx === undefined) return;
      const plan: Plan | undefined = (await loadPlans()).find((p) => p.id === planId);
      if (!plan) return;
      try {
        getStrategy(plan.progression).recordResult(plan, wdIdx, session, getAthlete());
        await saveAthlete();
      } catch {
        // A buggy strategy must never block session completion.
      }
    })().catch(() => { /* swallow */ });
  }, [session]);
}
