// One exercise row inside the plan editor, with its sets/reps steppers.

import { exerciseMeta, isTracked, MUSCLE_COLORS } from "@/data/exercises/catalog";
import type { WorkoutExercise } from "@/data/plans/plans";
import { titleCase } from "@/lib/format";

export function ExerciseCard({
  index, ex, autoManaged, onRemove, onSets, onReps,
}: {
  index: number; ex: WorkoutExercise;
  autoManaged: boolean;
  onRemove(): void; onSets(d: number): void; onReps(d: number): void;
}) {
  const meta = exerciseMeta(ex.exercise);
  const tracked = isTracked(ex.exercise);
  const reps = ex.sets[0]?.[0] ?? 10;
  const initial = ex.exercise[0]?.toUpperCase() ?? String(index + 1);
  const bg = meta ? MUSCLE_COLORS[meta.primary] : "#E0E0E8";

  return (
    <div className="bg-panel border border-border rounded-2xl p-3 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl grid place-items-center font-extrabold text-ink shrink-0"
          style={{ background: bg }}
        >
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink">{titleCase(ex.exercise)}</span>
            {tracked && (
              <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
                CAM
              </span>
            )}
            {autoManaged && (
              <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold tracking-wider">
                AUTO
              </span>
            )}
          </div>
          <div className="text-xs text-gray-dark mt-0.5">
            {autoManaged ? "Sets & reps set by progression" : (meta?.primary ?? "—")}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="w-9 h-9 rounded-full bg-panel-dark text-gray-dark grid place-items-center shrink-0 active:text-accent transition"
          aria-label={`Remove ${ex.exercise}`}
        >
          ×
        </button>
      </div>

      {!autoManaged && (
        <div className="flex gap-2 mt-3">
          <Stepper label="sets" value={ex.sets.length} onMinus={() => onSets(-1)} onPlus={() => onSets(+1)} />
          <Stepper label="reps" value={reps}           onMinus={() => onReps(-1)} onPlus={() => onReps(+1)} />
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: {
  label: string; value: number; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="flex-1 flex items-center justify-between bg-panel-dark rounded-full p-1">
      <button
        onClick={onMinus}
        className="w-9 h-9 rounded-full bg-panel text-ink text-xl grid place-items-center shrink-0"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="flex items-baseline gap-1 px-1 min-w-0">
        <span className="font-bold text-ink">{value}</span>
        <span className="text-[10px] text-gray-dark">{label}</span>
      </span>
      <button
        onClick={onPlus}
        className="w-9 h-9 rounded-full bg-nav text-white text-xl grid place-items-center shrink-0"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
