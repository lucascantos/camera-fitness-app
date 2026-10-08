// Ported from: scenes/home.py (legacy FitnessApp repo)
//
// Home screen, rebuilt mobile-first as a single scrolling column:
//   week strip → date + day label → hero "today's workout" card with Start
//   → Quick Start (least-trained scoring) → Last Session
//
// The previous 2/3-column desktop dashboard is gone; on wide screens this
// column simply centres and stops growing. Navigation lives in BottomNav.

import { useEffect, useMemo, useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import {
  DEFAULT_PLANS,
  getCachedPlans,
  loadPlans,
  makeSession,
  type Plan,
  type WorkoutDay,
} from "@/data/plans/plans";
import { getStrategy } from "@/data/progressions";
import { useSessionStore } from "@/stores/sessionStore";
import { titleCase } from "@/lib/format";
import { ContinueCard, Tile, WeekStrip } from "./home/cards";
import { TodayCard } from "./home/TodayCard";
import {
  formatHeaderDate, formatHistoryDate, mondayIndex, parseISODate, weekCompletedDays,
} from "./home/dates";
import { leastTrainedExercises } from "./home/quickStart";

/** Resolve the active plan from settings; fall back to first available. */
function resolveActivePlan(): Plan {
  const aid = getSettings().activePlanId;
  const pool = getCachedPlans().length > 0 ? getCachedPlans() : DEFAULT_PLANS;
  if (aid) {
    const m = pool.find((p) => p.id === aid);
    if (m) return m;
  }
  return pool[0];
}

/** Compute which workout day to run, mirroring legacy's `_day_cursor % n`. */
function resolveDayIndex(plan: Plan): number {
  const state = (getAthlete().progress as Record<string, { _day_cursor?: number }>)[plan.id];
  const cursor = state?._day_cursor ?? 0;
  return cursor % Math.max(1, plan.workouts.length);
}

export function Home() {
  const { startSession, goTo, session } = useSessionStore();

  const [activePlan, setActivePlan] = useState<Plan>(resolveActivePlan);
  const [dayIdx,     setDayIdx]     = useState<number>(() => resolveDayIndex(resolveActivePlan()));
  const [quick,      setQuick]      = useState<string[]>([]);

  // Today / week-dot state
  const today          = useMemo(() => new Date(), []);
  const dateHeader     = useMemo(() => formatHeaderDate(today), [today]);
  const todayMonIdx    = useMemo(() => mondayIndex(today), [today]);
  const completedDays  = useMemo(() => weekCompletedDays(getAthlete().history), []);

  useEffect(() => {
    (async () => {
      await loadPlans();           // populate the cache before resolving
      const p = resolveActivePlan();
      setActivePlan(p);
      setDayIdx(resolveDayIndex(p));
      setQuick(leastTrainedExercises(3));
    })();
  }, []);

  const today_workout: WorkoutDay | undefined = activePlan.workouts[dayIdx];
  const a = getAthlete();
  const last = a.history[a.history.length - 1];

  const startToday = () => {
    if (!today_workout) return;
    const strategy = getStrategy(activePlan.progression);
    startSession(strategy.prepareSession(activePlan, dayIdx, getAthlete()));
  };

  const startQuick = (name: string) => {
    // Quick-start sessions don't belong to a plan, so no progression
    // strategy applies — go straight to a 1×10 makeSession.
    startSession(makeSession(1, [[name, [[10, 0, false]]]]));
  };

  const dayLabel = today_workout
    ? (today_workout.name.length === 1 ? `Day ${today_workout.name}` : today_workout.name)
    : "No active plan";

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 max-w-lg mx-auto w-full">
      <WeekStrip todayIdx={todayMonIdx} completed={completedDays} />

      <div>
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          {dateHeader}
        </div>
        <h1 className="text-4xl font-extrabold text-ink leading-none mt-1.5">
          {dayLabel}
        </h1>
      </div>

      {/* Continue active session (only while one is open) */}
      <ContinueCard />

      {!session && (
        <TodayCard
          plan={activePlan}
          day={today_workout}
          onStart={startToday}
          onCreatePlan={() => goTo("plans")}
        />
      )}

      {/* Quick Start — flat list of cards, no wrapping panel */}
      <section>
        <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2 px-1">
          QUICK START
        </div>
        <div className="flex flex-col gap-2">
          {quick.map((name) => (
            <button
              key={name}
              onClick={() => startQuick(name)}
              className="w-full min-h-[56px] flex items-center bg-panel border border-border rounded-2xl px-4 py-3 shadow-card active:bg-panel-dark transition"
            >
              <span className="w-7 h-7 rounded-full border-2 border-accent shrink-0 mr-3" />
              <span className="font-bold flex-1 text-left text-ink">
                {titleCase(name)}
              </span>
              <span className="text-gray-dark text-xl leading-none">›</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2 px-1">
          LAST SESSION
        </div>
        <div className="bg-panel rounded-2xl p-4 border border-border shadow-card">
          {!last && <div className="text-gray-dark">No sessions yet</div>}
          {last && (() => {
            const d = parseISODate(last.date);
            const sub = d ? formatHistoryDate(d) : last.date;
            const title = last.exercises[0]?.exercise
              ? (last.exercises.length === 1
                  ? titleCase(last.exercises[0].exercise)
                  : `${titleCase(last.exercises[0].exercise)} +${last.exercises.length - 1}`)
              : "Session";
            const totalReps = last.exercises.reduce(
              (s, e) => s + e.sets.reduce((x, r) => x + r.reps, 0), 0);
            return (
              <>
                <div className="text-xl font-extrabold text-ink">{title}</div>
                <div className="text-sm text-gray-dark mt-0.5">{sub}</div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Tile label="REPS"  value={String(totalReps)} />
                  <Tile label="COINS" value={String(last.coinsEarned)} />
                </div>
              </>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
