// Shown between exercises in a workout: the cursor has already advanced to the
// next exercise (set 0). The rest happens here, so the screen is built around
// what the athlete needs while getting ready, in this order: a recap line of
// the exercise just finished (a small "done!" moment), what's up next, the
// rest timer, then how hard the last set was, and a tip. The full breakdown
// belongs to the Complete screen.
//
// Unlike rest between sets, this one doesn't start the next exercise by
// itself: switching exercises usually means moving the phone or the weights,
// so when the timer runs out it waits for "Start".

import { useMemo } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { getSettings } from "@/data/settings/settings";
import { useRestTimer } from "@/hooks/useRestTimer";
import { titleCase } from "@/lib/format";
import { recapExercise, type ExerciseRecap } from "./training/recap";
import { EffortRow } from "./rest/EffortRow";
import { TipCard } from "./rest/TipCard";
import { RestTimer } from "./rest/RestTimer";
import { UpNextPicker } from "./next/UpNextPicker";

export function NextExercise() {
  const { session, workoutIdx, goTo } = useSessionStore();
  const duration = getSettings().restSeconds;
  // No auto-start: the timer stops at 0 and RestTimer's button becomes "Start".
  const remaining = useRestTimer(duration, () => {});

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

  return (
    <div className="p-4 lg:p-10 flex flex-col gap-3 max-w-3xl">
      {prev && recap && <Recap exercise={prev.exercise} recap={recap} />}

      {/* Swipe to pick another remaining exercise, or find an alternative. */}
      <UpNextPicker session={session} workoutIdx={workoutIdx} />

      <RestTimer remaining={remaining} duration={duration} onSkip={() => goTo("training")} />
      {/* Rate the last set of the exercise just finished. */}
      {prev && <EffortRow session={session} wi={workoutIdx - 1} si={prev.sets.length - 1} />}
      <TipCard key={next.exercise} exercise={next.exercise} />
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

