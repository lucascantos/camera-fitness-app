// One exercise's set list inside the history editor.

import type { HistoryExercise } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import { titleCase } from "@/lib/format";

export function ExerciseEditor({
  ex, onSet, onAdjust, onAddSet, onRemoveSet, onRemoveExercise,
}: {
  ex: HistoryExercise;
  onSet(si: number, field: "reps" | "weight", v: number): void;
  onAdjust(si: number, field: "reps" | "weight", delta: number): void;
  onAddSet(): void;
  onRemoveSet(si: number): void;
  onRemoveExercise(): void;
}) {
  // Weight increments follow the same Settings › weight step the training
  // screen uses, so editing history feels like logging a live set.
  const weightStep = getSettings().weightStep;

  return (
    <div className="bg-panel rounded-2xl border border-border shadow-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-ink truncate">{titleCase(ex.exercise)}</div>
        <button
          onClick={onRemoveExercise}
          className="text-xs font-semibold text-gray-dark active:text-accent transition shrink-0 px-1"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {ex.sets.map((s, si) => (
          <div key={si} className="flex items-center gap-1.5">
            <span className="w-4 text-sm font-bold text-gray-dark shrink-0">{si + 1}</span>
            <Stepper
              value={s.reps}
              unit="reps"
              step={1}
              onAdjustBy={(d) => onAdjust(si, "reps", d)}
              onSet={(v) => onSet(si, "reps", v)}
            />
            <Stepper
              value={s.weight}
              unit="kg"
              step={weightStep}
              onAdjustBy={(d) => onAdjust(si, "weight", d)}
              onSet={(v) => onSet(si, "weight", v)}
            />
            <button
              onClick={() => onRemoveSet(si)}
              className="w-7 h-7 rounded-full text-gray-dark active:text-accent transition grid place-items-center shrink-0"
              aria-label={`Remove set ${si + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="mt-2 text-sm font-bold text-accent px-1 min-h-[36px]"
      >
        + Add set
      </button>
    </div>
  );
}

/**
 * Compact −/+ control with a directly editable value. Two of these plus a
 * remove button have to share a 375px row, so the buttons run 36px rather
 * than the usual 44px minimum; the number itself stays typeable so large
 * jumps (0 → 80kg) don't mean eighty taps.
 */
function Stepper({ value, unit, step, onAdjustBy, onSet }: {
  value: number; unit: string; step: number;
  onAdjustBy(delta: number): void;
  onSet(v: number): void;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center justify-between bg-panel-dark rounded-full p-1">
      <button
        onClick={() => onAdjustBy(-step)}
        className="w-9 h-9 rounded-full bg-panel text-ink text-lg grid place-items-center shrink-0"
        aria-label={`Decrease ${unit}`}
      >
        −
      </button>
      <span className="flex items-baseline justify-center min-w-0 px-0.5">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onSet(Number.isFinite(v) ? Math.max(0, v) : 0);
          }}
          className="w-8 bg-transparent text-center font-bold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={unit}
        />
        <span className="text-[10px] text-gray-dark shrink-0">{unit}</span>
      </span>
      <button
        onClick={() => onAdjustBy(step)}
        className="w-9 h-9 rounded-full bg-nav text-white text-lg grid place-items-center shrink-0"
        aria-label={`Increase ${unit}`}
      >
        +
      </button>
    </div>
  );
}
