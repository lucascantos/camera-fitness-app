// The hero "today's workout" card. Hidden while a session is in progress, so
// the screen offers one obvious next action (Continue) instead of two
// competing ones.

import type { Plan, WorkoutDay } from "@/data/plans/plans";
import { PlayIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";
import { Stat } from "./cards";

export function TodayCard({ plan, day, onStart, onCreatePlan }: {
  plan: Plan;
  day: WorkoutDay | undefined;
  onStart(): void;
  onCreatePlan(): void;
}) {
  const nExercises = day?.exercises.length ?? 0;
  const nSets = day?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0;
  const estMin = Math.max(1, Math.round(nSets * 1.5)); // ~90s per set

  return (
    <div className="bg-accent text-white rounded-3xl p-5">
      <div className="text-[11px] font-bold tracking-widest opacity-80">
        TODAY'S WORKOUT
      </div>
      <h2 className="text-2xl font-extrabold leading-tight mt-1.5">{plan.name}</h2>

      <div className="flex gap-8 mt-4">
        <Stat label="EXERCISES" value={String(nExercises)} />
        <Stat label="SETS"      value={String(nSets)} />
        <Stat label="EST. TIME" value={`${estMin}m`} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {day?.exercises.map((e) => (
          <span
            key={e.exercise}
            className="px-3.5 py-1.5 bg-white text-ink font-bold rounded-full text-sm"
          >
            {titleCase(e.exercise)}
          </span>
        ))}
      </div>

      {day ? (
        <button
          onClick={onStart}
          className="w-full mt-5 bg-white text-ink font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 active:bg-panel-dark transition"
        >
          <PlayIcon size={14} color="#1A1330" />
          Start workout
        </button>
      ) : (
        <button
          onClick={onCreatePlan}
          className="w-full mt-5 bg-white text-ink font-bold py-4 rounded-2xl text-lg active:bg-panel-dark transition"
        >
          + Create a plan
        </button>
      )}
    </div>
  );
}
