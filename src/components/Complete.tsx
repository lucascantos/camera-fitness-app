// Ported from: scenes/complete.py (legacy FitnessApp repo)

import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { awardSession, getAthlete, saveAthlete } from "@/data/athlete/athlete";
import { loadPlans, type Plan } from "@/data/plans/plans";
import { getStrategy } from "@/data/progressions";
import { say } from "@/data/trainers/say";
import { fanfare } from "@/audio/sfx";

export function Complete() {
  const { session, endSession } = useSessionStore();
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    if (!session) return;
    // Trainer line + ascending fanfare on enter.
    say("complete");
    fanfare();

    let repCoins = 0;
    let setCoins = 0;
    const exercises = session.workouts.map((w) => ({
      exercise: w.exercise,
      sets: w.sets.map((s) => {
        const actuals = s[3] as { reps: number; weight: number } | undefined;
        return actuals ?? { reps: s[0] as number, weight: s[1] as number };
      }),
    }));
    for (const ex of exercises) {
      for (const s of ex.sets) { repCoins += s.reps; setCoins += 2; }
    }
    const total = repCoins + setCoins;
    setTotalCoins(total);

    (async () => {
      await awardSession(session.sessionId, exercises, total);

      // If the session belongs to a plan, let the progression strategy
      // update working weights / TM / week index for next time.
      const planId = session.planId;
      const wdIdx  = session.workoutDayIndex;
      if (planId && wdIdx !== undefined) {
        const plans = await loadPlans();
        const plan: Plan | undefined = plans.find((p) => p.id === planId);
        if (plan) {
          const strategy = getStrategy(plan.progression);
          try {
            strategy.recordResult(plan, wdIdx, session, getAthlete());
            await saveAthlete();
          } catch {
            // A buggy strategy must never block session completion.
          }
        }
      }
    })().catch(() => { /* swallow */ });
  }, [session]);

  if (!session) return null;

  const totalReps = session.workouts.reduce(
    (s, w) => s + w.sets.reduce((x, set) => x + ((set[3] as any)?.reps ?? (set[0] as number)), 0),
    0,
  );
  const totalSets = session.workouts.reduce((s, w) => s + w.sets.length, 0);

  return (
    <div className="p-10 h-full">
      <div className="bg-panel rounded-3xl p-10 max-w-3xl">
        <div className="text-accent text-5xl font-black leading-none">SESSION</div>
        <div className="text-accent text-5xl font-black leading-none">COMPLETE!</div>

        <div className="mt-6 bg-panel-dark rounded-2xl p-5">
          {session.workouts.map((w) => {
            const reps = w.sets.reduce((s, set) => s + ((set[3] as any)?.reps ?? (set[0] as number)), 0);
            return (
              <div key={w.exercise} className="py-1 text-lg">
                ✓ {titleCase(w.exercise)} · {w.sets.length} sets · {reps} reps
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-panel-dark rounded-2xl p-5 text-coin">
          <Row val={`+${totalReps}`} note={`${totalReps} reps × 1 coin`} />
          <Row val={`+${totalSets * 2}`} note={`${totalSets} sets × 2 coins`} />
          <div className="border-t border-border my-2" />
          <Row val={`+${totalCoins} earned`} />
          <div className="text-sm text-gray-dark mt-1">
            Balance: {getAthlete().coins} coins
          </div>
        </div>

        <button
          onClick={endSession}
          className="mt-8 bg-accent text-on_accent font-bold py-3 px-8 rounded-2xl"
        >
          ← Home
        </button>
      </div>
    </div>
  );
}

function Row({ val, note }: { val: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <div className="text-2xl font-extrabold text-coin">{val}</div>
      {note && <div className="text-sm text-gray-dark">{note}</div>}
    </div>
  );
}

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase())}
