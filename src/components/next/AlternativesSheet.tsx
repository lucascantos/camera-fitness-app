// "Find alternatives": other exercises for the same muscle as the one up
// next. Picking one swaps it in for this workout only.

import { exerciseMeta, isTracked, MUSCLE_COLORS } from "@/data/exercises/catalog";
import { titleCase } from "@/lib/format";
import { Backdrop } from "@/components/training/ui";
import { alternativesFor } from "./upcoming";

export function AlternativesSheet({ exercise, onPick, onClose }: {
  exercise: string; onPick(name: string): void; onClose(): void;
}) {
  const muscle = exerciseMeta(exercise)?.primary;
  const options = alternativesFor(exercise);

  return (
    <Backdrop onClose={onClose} align="bottom">
      <div
        className="bg-panel w-full max-w-lg rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          ALTERNATIVES{muscle ? ` · ${muscle.toUpperCase()}` : ""}
        </div>
        <div className="text-xl font-extrabold text-ink mt-1">Instead of {titleCase(exercise)}</div>

        {options.length === 0 ? (
          <p className="text-gray-dark mt-4">No other exercises for this muscle yet.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {options.map((m) => (
              <button
                key={m.name}
                onClick={() => onPick(m.name)}
                className="w-full min-h-[56px] flex items-center gap-3 bg-panel-dark rounded-2xl px-4 py-3 text-left active:bg-border transition"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: MUSCLE_COLORS[m.primary] }} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-ink truncate">{titleCase(m.name)}</span>
                  <span className="block text-xs text-gray-dark">
                    {titleCase(m.equipment)}{isTracked(m.name) ? " · camera tracked" : " · manual count"}
                  </span>
                </span>
                <span className="text-gray-dark text-xl leading-none">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Backdrop>
  );
}
