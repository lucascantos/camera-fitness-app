// Shown between exercises in a workout: the cursor has already advanced to the
// next exercise (set 0). The rest happens here, so the screen is built around
// what the athlete needs while getting ready: what's up next, how long they
// have, and a way to skip. A single recap line of the exercise just finished
// sits on top — enough of a "done!" moment without pulling focus from the
// next one. The full breakdown belongs to the Complete screen.

import { useMemo } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { SessionSet } from "@/data/plans/plans";
import { getSettings } from "@/data/settings/settings";
import { useRestTimer } from "@/hooks/useRestTimer";
import { titleCase } from "@/lib/format";
import { recapExercise, type ExerciseRecap } from "./training/recap";

export function NextExercise() {
  const { session, workoutIdx, goTo } = useSessionStore();
  const duration = getSettings().restSeconds;
  const remaining = useRestTimer(duration, () => goTo("training"));

  const prev = session?.workouts[workoutIdx - 1];
  // Computed once on entry: history doesn't change while resting.
  const recap = useMemo(
    () => (prev ? recapExercise(prev.exercise, prev.sets) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!session) return null;
  const next = session.workouts[workoutIdx];
  if (!next) return null;

  const pct = Math.max(0, (remaining / duration) * 100);

  return (
    <div className="p-4 lg:p-10 flex flex-col gap-3 max-w-3xl">
      {prev && recap && <Recap exercise={prev.exercise} recap={recap} />}

      <div className="bg-panel rounded-3xl p-6 border border-border shadow-card">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          UP NEXT · EXERCISE {workoutIdx + 1} OF {session.workouts.length}
        </div>
        <div className="text-4xl font-black leading-none mt-2 text-ink">
          {titleCase(next.exercise)}
        </div>
        <div className="text-gray-dark text-lg mt-2">{setsSummary(next.sets)}</div>
      </div>

      <div className="bg-panel rounded-3xl p-6 border border-border shadow-card">
        <div className="text-accent text-xl font-extrabold tracking-wide">REST</div>
        <div className="flex items-baseline gap-2 mt-1">
          <div className="text-[5rem] font-black leading-none text-ink tabular-nums">
            {remaining}
          </div>
          <div className="text-gray-dark text-lg">sec</div>
        </div>
        <div className="mt-4 h-3 bg-panel-dark rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button
          onClick={() => goTo("training")}
          className="mt-6 w-full bg-accent text-on_accent font-bold py-4 rounded-2xl hover:bg-accent-hov transition"
        >
          Skip rest →
        </button>
      </div>
    </div>
  );
}

function Recap({ exercise, recap }: { exercise: string; recap: ExerciseRecap }) {
  const parts = [
    `${recap.setsDone} ${recap.setsDone === 1 ? "set" : "sets"}`,
    `${recap.totalReps} reps`,
  ];
  if (recap.topWeight > 0) parts.push(`${recap.topWeight} kg`);

  return (
    <div className="bg-panel-dark rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-good text-on_accent grid place-items-center font-black shrink-0">
        ✓
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-ink truncate">{titleCase(exercise)}</div>
        <div className="text-sm text-gray-dark">{parts.join(" · ")}</div>
      </div>
      {recap.best && (
        <div className="shrink-0 bg-coin text-white text-xs font-extrabold tracking-wide rounded-full px-2.5 py-1">
          {recap.best === "weight" ? "NEW BEST" : "REP BEST"}
        </div>
      )}
    </div>
  );
}

function setsSummary(sets: SessionSet[]): string {
  const n = sets.length;
  const first = sets[0];
  if (!first) return `${n} sets`;
  const [reps, weight] = first;
  const load = weight > 0 ? `${weight} kg` : "bodyweight";
  return `${n} × ${reps} reps · ${load}`;
}
