// Shown between exercises in a workout: the cursor has already advanced to the
// next exercise (set 0). Presents what's up next plus the remaining exercises,
// and a button to start — replacing the bare rest timer at exercise boundaries.

import { useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { SessionSet } from "@/data/plans/plans";
import { getSettings } from "@/data/settings/settings";
import { say } from "@/data/trainers/say";
import { PlayIcon } from "@/components/icons";
import { TrainerPanel } from "@/components/trainer/TrainerPanel";

export function NextExercise() {
  const { session, workoutIdx, goTo } = useSessionStore();

  useEffect(() => {
    say("rest");
  }, []);

  if (!session) return null;

  const next = session.workouts[workoutIdx];
  if (!next) return null;

  const remaining = session.workouts.slice(workoutIdx);
  const doneCount = workoutIdx;
  const total = session.workouts.length;

  const trainerOn = getSettings().trainerEnabled;
  const gridCls = trainerOn
    ? "grid grid-cols-[260px_1fr] gap-6 p-10 h-full"
    : "p-10 h-full";

  return (
    <div className={gridCls}>
      {trainerOn && <TrainerPanel characterHeight={300} />}
      <div className="bg-panel rounded-3xl p-10 max-w-3xl border border-border shadow-card flex flex-col">
        <div className="text-good text-xl font-extrabold tracking-widest">
          EXERCISE COMPLETE
        </div>

        {/* Up next */}
        <div className="mt-2 text-[11px] font-bold tracking-widest text-gray-dark">
          UP NEXT
        </div>
        <div className="text-5xl font-black leading-none mt-1 text-ink">
          {titleCase(next.exercise)}
        </div>
        <div className="text-gray-dark text-lg mt-2">
          {setsSummary(next.sets)}
        </div>

        {/* Remaining workout */}
        <div className="mt-6 bg-panel-dark rounded-2xl p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
            REMAINING · {doneCount} OF {total} DONE
          </div>
          {remaining.map((w, i) => (
            <div
              key={`${w.exercise}-${i}`}
              className={
                "flex items-baseline justify-between py-1.5 " +
                (i === 0 ? "text-ink font-bold" : "text-gray-dark")
              }
            >
              <span>
                {i === 0 ? "▶ " : `${i + 1}. `}
                {titleCase(w.exercise)}
              </span>
              <span className="text-sm">{setsSummary(w.sets)}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => goTo("training")}
          className="mt-8 bg-accent text-on_accent font-bold py-4 px-8 rounded-2xl hover:bg-accent-hov transition flex items-center justify-center gap-3 self-start"
        >
          <PlayIcon size={14} color="#FFFFFF" />
          Start {titleCase(next.exercise)}
        </button>
      </div>
    </div>
  );
}

function setsSummary(sets: SessionSet[]): string {
  const n = sets.length;
  const reps = sets[0]?.[0];
  return reps != null ? `${n} × ${reps} reps` : `${n} sets`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
