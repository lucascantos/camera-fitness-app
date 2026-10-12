// Ported from: scenes/home.py (legacy FitnessApp repo)
//
// Home screen, mobile-first single column:
//   week strip → billboard (rotating news about the athlete) → Start button
//
// The streak lives in the header (TopNav → StreakBadge). The billboard is the
// screen's centre of gravity: progress, the last workout, bests, body stats —
// and later Calibration and the cycle's checkpoint (docs/guided-mode-design.md).
// Start opens the session preview; the workout itself begins from there.

import { useEffect, useMemo, useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { loadBodyLog } from "@/data/body/body";
import { loadPlans, type Plan } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";
import { ContinueCard, WeekStrip } from "./home/cards";
import { Billboard } from "./home/Billboard";
import { StartButton } from "./home/StartButton";
import { mondayIndex, weekCompletedDays } from "./home/dates";
import { resolveActivePlan, resolveDayIndex } from "./home/activePlan";

export function Home() {
  const { goTo, session } = useSessionStore();

  const [activePlan, setActivePlan] = useState<Plan>(resolveActivePlan);
  const [dayIdx,     setDayIdx]     = useState<number>(() => resolveDayIndex(resolveActivePlan()));
  // Bumped once async data (plans, body log) is in, so the billboard rebuilds.
  const [loaded,     setLoaded]     = useState(0);

  const todayMonIdx   = useMemo(() => mondayIndex(new Date()), []);
  const completedDays = useMemo(() => weekCompletedDays(getAthlete().history), []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadPlans(), loadBodyLog()]);
      const p = resolveActivePlan();
      setActivePlan(p);
      setDayIdx(resolveDayIndex(p));
      setLoaded((n) => n + 1);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 max-w-lg mx-auto w-full">
      <WeekStrip todayIdx={todayMonIdx} completed={completedDays} />

      <Billboard refreshKey={loaded} />

      {/* Continue the open session, or preview the plan's next day. */}
      <ContinueCard />
      {!session && (
        <StartButton
          plan={activePlan}
          day={activePlan.workouts[dayIdx]}
          onStart={() => goTo("preview")}
          onCreatePlan={() => goTo("plans")}
        />
      )}
    </div>
  );
}
