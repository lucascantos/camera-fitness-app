// Ported from: scenes/home.py (legacy FitnessApp repo)
// Home dashboard. Layout matches the legacy "fitpop" red/white screenshot:
//   left column   — date row, big day label, week dots, hero card with Start
//   right column  — Quick Start (least-trained scoring), Last Session

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
import { PlayIcon } from "@/components/icons";
import { TrainerGreeting } from "@/components/trainer/TrainerGreeting";

// ---------------------------------------------------------------------------
// Constants — exercise → primary muscles, used by the least-trained scoring.
// ---------------------------------------------------------------------------
const EX_MUSCLES: Record<string, string[]> = {
  "bicep curl":     ["Biceps", "Forearms"],
  "push ups":       ["Chest", "Triceps", "Front Delts"],
  "squat":          ["Quads", "Glutes", "Hamstrings"],
  "lateral raise":  ["Side Delts"],
  "deadlift":       ["Hamstrings", "Glutes", "Lats", "Traps"],
  "bench press":    ["Chest", "Triceps", "Front Delts"],
  "overhead press": ["Front Delts", "Triceps", "Traps"],
  "barbell row":    ["Lats", "Biceps", "Rear Delts", "Traps"],
};
const ALL_EXERCISES = Object.keys(EX_MUSCLES);

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns 0..6 with Monday=0, matching the legacy week-dot order. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Parse a "YYYY-MM-DD" history date as a local Date. */
function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

/** Set of weekday indices (Monday-based) that have a session this ISO week. */
function weekCompletedDays(history: ReturnType<typeof getAthlete>["history"]): Set<number> {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayIndex(today));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const out = new Set<number>();
  for (const entry of history) {
    const d = parseISODate(entry.date);
    if (!d) continue;
    if (d >= monday && d <= sunday) out.add(mondayIndex(d));
  }
  return out;
}

function leastTrainedExercises(limit = 3): string[] {
  const a = getAthlete();
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const exReps: Record<string, number> = Object.fromEntries(
    ALL_EXERCISES.map((e) => [e, 0]),
  );
  for (const entry of a.history) {
    const d = parseISODate(entry.date);
    if (d && d.getTime() < cutoff) continue;
    for (const ex of entry.exercises) {
      if (ex.exercise in exReps) {
        exReps[ex.exercise] += ex.sets.reduce((s, r) => s + r.reps, 0);
      }
    }
  }
  const muscleReps: Record<string, number> = {};
  for (const ex of ALL_EXERCISES) {
    for (const m of EX_MUSCLES[ex]) {
      muscleReps[m] = (muscleReps[m] ?? 0) + exReps[ex];
    }
  }
  const score = (ex: string) =>
    EX_MUSCLES[ex].reduce((s, m) => s + 1 / (1 + (muscleReps[m] ?? 0)), 0);
  return [...ALL_EXERCISES].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

function formatHeaderDate(d: Date): string {
  const wd = DAY_NAMES_SHORT[mondayIndex(d)].toUpperCase();
  const mo = MONTHS_SHORT[d.getMonth()].toUpperCase();
  return `${wd} · ${mo} ${d.getDate()}`;
}

function formatHistoryDate(d: Date): string {
  const wd = DAY_NAMES_SHORT[mondayIndex(d)];
  const mo = MONTHS_SHORT[d.getMonth()];
  const day = String(d.getDate()).padStart(2, "0");
  return `${wd} · ${mo} ${day}`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Home() {
  const { startSession, goTo } = useSessionStore();

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
    const s = strategy.prepareSession(activePlan, dayIdx, getAthlete());
    startSession(s);
  };

  const startQuick = (name: string) => {
    // Quick-start sessions don't belong to a plan, so no progression
    // strategy applies — go straight to a 1×10 makeSession.
    const s = makeSession(1, [[name, [[10, 0, false]]]]);
    startSession(s);
  };

  const nExercises = today_workout?.exercises.length ?? 0;
  const nSets      = today_workout?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0;
  const estMin     = Math.max(1, Math.round(nSets * 1.5)); // ~90s per set

  const dayLabel = today_workout
    ? (today_workout.name.length === 1 ? `Day ${today_workout.name}` : today_workout.name)
    : "No active plan";

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-[1fr_360px] gap-6 px-8 pb-8 h-full">
      {/* ── Centre column ─────────────────────────────────────────────── */}
      <section className="flex flex-col">
        {/* Date + Day name + Week dots row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-dark">
              {dateHeader}
            </div>
            <h1 className="text-5xl font-extrabold text-ink leading-none mt-2">
              {dayLabel}
            </h1>
          </div>
          <WeekDots todayIdx={todayMonIdx} completed={completedDays} />
        </div>

        {/* Hero workout card */}
        <div className="bg-accent text-white rounded-3xl p-7 mt-6 flex flex-col flex-1">
          <div className="text-[11px] font-bold tracking-widest opacity-80">
            TODAY'S WORKOUT
          </div>
          <h2 className="text-5xl font-extrabold leading-none mt-2">
            {activePlan.name}
          </h2>

          <div className="flex gap-10 mt-6">
            <Stat label="EXERCISES" value={String(nExercises)} />
            <Stat label="SETS"      value={String(nSets)} />
            <Stat label="EST. TIME" value={`${estMin}m`} />
          </div>

          {/* exercise pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {today_workout?.exercises.map((e) => (
              <span
                key={e.exercise}
                className="px-4 py-1.5 bg-white text-ink font-bold rounded-full text-sm"
              >
                {titleCase(e.exercise)}
              </span>
            ))}
          </div>

          {/* Start button at the bottom */}
          {today_workout ? (
            <button
              onClick={startToday}
              className="mt-auto bg-white text-ink font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-panel-dark transition"
            >
              <PlayIcon size={14} color="#1A1330" />
              Start workout
            </button>
          ) : (
            <button
              onClick={() => goTo("plans")}
              className="mt-auto bg-white text-ink font-bold py-4 rounded-2xl text-lg hover:bg-panel-dark transition"
            >
              + Create a plan
            </button>
          )}
        </div>
      </section>

      {/* ── Right sidebar ─────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-5">
        {/* Trainer greeting card */}
        <TrainerGreeting />

        {/* Quick Start */}
        <div className="bg-panel rounded-3xl p-5 border border-border shadow-card">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3 px-1">
            QUICK START
          </div>
          {quick.map((name) => (
            <button
              key={name}
              onClick={() => startQuick(name)}
              className="w-full flex items-center bg-panel-dark rounded-xl px-4 py-3 mt-2 hover:bg-bg transition"
            >
              {/* red ring icon — matches the screenshot */}
              <span className="w-7 h-7 rounded-full border-2 border-accent grid place-items-center mr-3" />
              <span className="font-bold flex-1 text-left text-ink">
                {titleCase(name)}
              </span>
              <span className="text-gray-dark text-xl leading-none">›</span>
            </button>
          ))}
        </div>

        {/* Last Session */}
        <div className="bg-panel rounded-3xl p-5 border border-border shadow-card flex-1 min-h-[280px]">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3 px-1">
            LAST SESSION
          </div>
          {!last && (
            <div className="text-gray-dark px-1">No sessions yet</div>
          )}
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
              <div className="px-1">
                <div className="text-2xl font-extrabold text-ink">{title}</div>
                <div className="text-sm text-gray-dark mt-0.5">{sub}</div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Tile label="REPS"  value={String(totalReps)} />
                  <Tile label="COINS" value={String(last.coinsEarned)} />
                </div>
              </div>
            );
          })()}
        </div>
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Small subcomponents
// ────────────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest opacity-80">
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-dark rounded-xl p-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-2 text-ink">{value}</div>
    </div>
  );
}

function WeekDots({
  todayIdx,
  completed,
}: {
  todayIdx: number;
  completed: Set<number>;
}) {
  return (
    <div className="flex gap-1.5">
      {DAY_LETTERS.map((letter, i) => {
        const isToday = i === todayIdx;
        const done    = completed.has(i);
        const cls = done
          ? "bg-good text-white border-good"
          : isToday
          ? "bg-accent text-white border-accent"
          : "bg-panel text-gray-dark border-border";
        return (
          <div
            key={i}
            className={
              "w-9 h-9 rounded-lg grid place-items-center font-bold text-sm border " + cls
            }
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}
