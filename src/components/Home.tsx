// Ported from: scenes/home.py (legacy FitnessApp repo)
// Home dashboard: today's workout + Quick Start + last session summary.

import { useEffect, useMemo, useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { DEFAULT_PLANS, makeSession, type Plan, type PrescribedSet } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";

// exercise → muscles, for the "least trained" Quick Start scoring.
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

function leastTrainedExercises(limit = 3): string[] {
  const a = getAthlete();
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const exReps: Record<string, number> = Object.fromEntries(
    ALL_EXERCISES.map((e) => [e, 0]),
  );
  for (const entry of a.history) {
    const t = new Date(entry.date).getTime();
    if (isFinite(t) && t < cutoff) continue;
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

export function Home() {
  const { startSession } = useSessionStore();
  const [activePlan] = useState<Plan>(DEFAULT_PLANS[0]);
  const [quick, setQuick] = useState<string[]>([]);
  const a = getAthlete();

  useEffect(() => { setQuick(leastTrainedExercises(3)); }, []);

  const today = activePlan.workouts[0];
  const nSets = useMemo(
    () => today.exercises.reduce((s, e) => s + e.sets.length, 0),
    [today],
  );

  const startToday = () => {
    const s = makeSession(
      today.name,
      today.exercises.map((e) => [e.exercise, e.sets] as [string, PrescribedSet[]]),
      { planId: activePlan.id, workoutDayIndex: 0 },
    );
    startSession(s);
  };

  const startQuick = (name: string) => {
    const s = makeSession(1, [[name, [[10, 0, false]]]]);
    startSession(s);
  };

  const last = a.history[a.history.length - 1];

  return (
    <div className="grid grid-cols-3 gap-6 p-6 h-full">
      {/* Hero */}
      <section className="col-span-2 bg-accent rounded-3xl p-8 flex flex-col">
        <div className="text-xs font-bold tracking-widest opacity-80">TODAY'S WORKOUT</div>
        <h1 className="text-5xl font-extrabold mt-2">{activePlan.name}</h1>
        <div className="flex gap-8 mt-6 text-on_accent">
          <Stat label="EXERCISES" value={String(today.exercises.length)} />
          <Stat label="SETS"      value={String(nSets)} />
          <Stat label="EST. TIME" value={`${Math.max(1, Math.round(nSets * 1.5))}m`} />
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          {today.exercises.map((e) => (
            <span key={e.exercise} className="px-3 py-1 bg-panel rounded-full text-sm">
              {titleCase(e.exercise)}
            </span>
          ))}
        </div>
        <button
          onClick={startToday}
          className="mt-auto bg-bg text-white font-bold py-4 rounded-2xl text-lg hover:bg-panel transition"
        >
          ▶ Start workout
        </button>
      </section>

      {/* Sidebar */}
      <aside className="flex flex-col gap-4">
        <div className="bg-panel rounded-2xl p-5 border border-border">
          <div className="text-xs font-bold tracking-widest text-gray-dark mb-3">QUICK START</div>
          {quick.map((name) => (
            <button
              key={name}
              onClick={() => startQuick(name)}
              className="w-full flex items-center bg-panel-dark rounded-xl px-4 py-3 mt-2 hover:bg-bg transition"
            >
              <div className="w-7 h-7 rounded-full bg-accent mr-3" />
              <span className="font-bold flex-1 text-left">{titleCase(name)}</span>
              <span className="text-gray-dark">›</span>
            </button>
          ))}
        </div>
        <div className="bg-panel rounded-2xl p-5 border border-border flex-1">
          <div className="text-xs font-bold tracking-widest text-gray-dark mb-3">LAST SESSION</div>
          {!last && <div className="text-gray-dark">No sessions yet</div>}
          {last && (
            <div>
              <div className="font-bold text-lg">
                {last.exercises[0]?.exercise ? titleCase(last.exercises[0].exercise) : "Session"}
              </div>
              <div className="text-sm text-gray-dark">{last.date}</div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Tile label="REPS" value={String(last.exercises.reduce(
                  (s, e) => s + e.sets.reduce((x, r) => x + r.reps, 0), 0))} />
                <Tile label="COINS" value={String(last.coinsEarned)} />
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest opacity-80">{label}</div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-dark rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
