// Home's one action: start the active plan's next day. Exercise count,
// estimated time and the plan sit on a second line so the button alone says what
// you're about to do. With no plan it offers to create one instead.

import type { Plan, WorkoutDay } from "@/data/plans/plans";
import { PlayIcon } from "@/components/icons";
import { dayLabel } from "./activePlan";

export function StartButton({ plan, day, onStart, onCreatePlan }: {
  plan: Plan;
  day: WorkoutDay | undefined;
  onStart(): void;
  onCreatePlan(): void;
}) {
  if (!day) {
    return (
      <button
        onClick={onCreatePlan}
        className="w-full bg-accent text-on_accent font-bold py-4 rounded-2xl text-lg active:bg-accent-hov transition"
      >
        + Create a plan
      </button>
    );
  }

  const nSets = day.exercises.reduce((s, e) => s + e.sets.length, 0);
  const estMin = Math.max(1, Math.round(nSets * 1.5)); // ~90s per set
  const dayName = dayLabel(day.name);
  const nEx = day.exercises.length;

  return (
    <button
      onClick={onStart}
      className="w-full bg-accent text-on_accent rounded-2xl px-5 py-3.5 flex items-center gap-4 active:bg-accent-hov transition text-left"
    >
      <span className="w-11 h-11 rounded-full bg-white/20 grid place-items-center shrink-0">
        <PlayIcon size={14} color="currentColor" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-extrabold leading-tight">Start {dayName}</span>
        <span className="block text-sm opacity-85 truncate">
          {nEx} {nEx === 1 ? "exercise" : "exercises"} · {estMin} min · {plan.name}
        </span>
      </span>
    </button>
  );
}
