// Small presentational pieces of the Home column.

import { useSessionStore } from "@/stores/sessionStore";
import { PlayIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";
import { DAY_LETTERS } from "./dates";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest opacity-80">
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-dark rounded-xl p-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-2 text-ink">{value}</div>
    </div>
  );
}

export function ContinueCard() {
  const { session, workoutIdx, setIdx, goTo } = useSessionStore();
  if (!session) return null;

  const workout = session.workouts[workoutIdx];
  const exercise = workout?.exercise ?? "Workout";
  const setLabel = `Set ${setIdx + 1}/${workout?.sets.length ?? 0}`;
  const exLabel  = `Ex ${workoutIdx + 1}/${session.workouts.length}`;

  // Compact single row: with the hero card hidden during a session, this is
  // the screen's primary action and doesn't need to shout.
  return (
    <div className="bg-good rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card">
      <span className="w-2 h-2 rounded-full bg-white shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate">{titleCase(exercise)}</div>
        <div className="text-xs text-white/80 truncate">{exLabel} · {setLabel}</div>
      </div>
      <button
        onClick={() => goTo("training")}
        className="shrink-0 bg-white text-good font-bold px-4 min-h-[44px] rounded-xl flex items-center gap-2 active:bg-panel-dark transition"
      >
        <PlayIcon size={11} />
        Continue
      </button>
    </div>
  );
}

/** Full-width weekday strip; each cell flexes so the row spans the screen. */
export function WeekStrip({ todayIdx, completed }: {
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
              "flex-1 h-11 rounded-xl grid place-items-center font-bold text-sm border " + cls
            }
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}
