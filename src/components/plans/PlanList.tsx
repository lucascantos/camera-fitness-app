// "Your Plans" — the list view, one card per plan plus a + New affordance.

import { getStrategy } from "@/data/progressions";
import { getAthlete } from "@/data/athlete/athlete";
import type { Plan, ProgressionId } from "@/data/plans/plans";

const PROGRESSION_LABEL: Record<ProgressionId, string> = {
  linear: "Linear",
  five_three_one: "5/3/1",
  volume: "Volume",
};

export function PlanList({ plans, activeId, onOpen, onCreate }: {
  plans: Plan[];
  activeId: string | null;
  onOpen(id: string): void;
  onCreate(): void;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4 max-w-lg mx-auto w-full">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-extrabold text-ink">Your Plans</h1>
        <span className="text-sm font-bold text-gray-dark">{plans.length}</span>
      </div>

      <button
        onClick={onCreate}
        className="border-2 border-dashed border-accent text-accent font-bold min-h-[56px] rounded-2xl active:bg-accent/5 transition"
      >
        + New plan
      </button>

      <div className="flex flex-col gap-3">
        {plans.map((p) => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className={
                "w-full text-left flex items-center gap-3 bg-panel rounded-2xl px-4 py-4 shadow-card transition active:bg-panel-dark border-2 " +
                (isActive ? "border-accent" : "border-transparent")
              }
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink truncate">{p.name}</div>
                <div className="text-xs text-gray-dark mt-0.5 truncate">
                  {(getStrategy(p.progression).describe?.(p, getAthlete())
                    ?? PROGRESSION_LABEL[p.progression])}{" "}
                  · {p.workouts.length} day{p.workouts.length === 1 ? "" : "s"}
                </div>
              </div>
              {isActive && (
                <span className="px-2.5 py-1 rounded-full bg-good/15 text-good text-xs font-bold shrink-0">
                  Active
                </span>
              )}
              <span className="text-gray-dark text-xl leading-none shrink-0">›</span>
            </button>
          );
        })}

        {plans.length === 0 && (
          <div className="text-center py-10">
            <div className="text-xl font-extrabold text-ink">No plans yet</div>
            <p className="text-gray-dark mt-1">Create your first plan to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
