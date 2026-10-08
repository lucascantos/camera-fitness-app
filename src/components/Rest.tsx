// Ported from: scenes/rest.py (legacy FitnessApp repo)

import { useSessionStore } from "@/stores/sessionStore";
import { getSettings } from "@/data/settings/settings";
import { useRestTimer } from "@/hooks/useRestTimer";

export function Rest() {
  const duration = getSettings().restSeconds;
  const { goTo } = useSessionStore();
  const remaining = useRestTimer(duration, () => goTo("training"));

  const pct = Math.max(0, (remaining / duration) * 100);

  return (
    <div className="p-4 lg:p-10 lg:h-full flex flex-col gap-3 max-w-3xl">
      <div className="bg-panel rounded-3xl p-6 lg:p-10 border border-border shadow-card">
        <div className="text-accent text-3xl font-extrabold">REST</div>
        <div className="text-[5rem] lg:text-[8rem] font-black leading-none mt-4 text-ink">
          {remaining}
        </div>
        <div className="text-gray-dark text-lg">seconds remaining</div>
        <div className="mt-6 h-3 bg-panel-dark rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button
          onClick={() => goTo("training")}
          className="mt-8 bg-accent text-on_accent font-bold py-3 px-8 rounded-2xl hover:bg-accent-hov transition"
        >
          Skip Rest  →
        </button>
      </div>
      <NextSet />
    </div>
  );
}

/**
 * What the plan prescribes for the coming set — above all the weight, so the
 * plates can be changed during the rest instead of after it. Plan sessions
 * only: a standalone exercise just repeats the last set, so there's nothing
 * new to tell. The cursor has already moved to the coming set by the time
 * Rest is shown.
 */
function NextSet() {
  const { session, workoutIdx, setIdx } = useSessionStore();
  if (!session?.planId) return null;
  const sets = session.workouts[workoutIdx]?.sets;
  const next = sets?.[setIdx];
  if (!sets || !next) return null;

  const [reps, weight, amrap] = next;
  const before = sets[setIdx - 1];
  const prevWeight = before ? (before[3]?.weight ?? before[1]) : weight;
  const delta = weight - prevWeight;

  return (
    <div className="bg-panel rounded-3xl p-6 border border-border shadow-card animate-fade-in">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark">
        NEXT · SET {setIdx + 1} OF {sets.length}
      </div>
      <div className="flex items-baseline gap-3 mt-2 flex-wrap">
        <div className="text-4xl font-black leading-none text-ink">
          {weight > 0 ? `${weight} kg` : "Bodyweight"}
        </div>
        {delta !== 0 && weight > 0 && (
          <div
            className={
              "text-sm font-extrabold rounded-full px-2.5 py-1 " +
              (delta > 0 ? "bg-accent text-on_accent" : "bg-panel-dark text-ink")
            }
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} kg
          </div>
        )}
      </div>
      <div className="text-gray-dark text-lg mt-2">
        {amrap ? `${reps}+ reps · as many as you can` : `${reps} reps`}
      </div>
    </div>
  );
}
