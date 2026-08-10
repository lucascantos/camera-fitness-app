// Bottom sheet listing the whole catalog, for adding an exercise to a day.

import { EXERCISE_CATALOG, isTracked, MUSCLE_COLORS } from "@/data/exercises/catalog";
import { useDismissable } from "@/hooks/useDismissable";
import { titleCase } from "@/lib/format";

export function ExercisePicker({ alreadyIn, onPick, onClose }: {
  alreadyIn: string[]; onPick(name: string): void; onClose(): void;
}) {
  const { closing, dismiss } = useDismissable(onClose);
  return (
    <div
      className={
        "fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 " +
        (closing ? "animate-fade-out" : "animate-fade-in")
      }
      onClick={dismiss}
    >
      <div
        className={
          "bg-panel rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-[480px] max-h-[85dvh] overflow-y-auto border border-border shadow-card " +
          (closing ? "animate-sheet-down sm:animate-fade-out" : "animate-sheet-up sm:animate-fade-in")
        }
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-extrabold text-ink">Add exercise</h2>
          <button onClick={dismiss} className="text-gray-dark text-2xl leading-none px-2">×</button>
        </div>
        <div className="flex flex-col gap-2">
          {EXERCISE_CATALOG.map((m) => {
            const inUse = alreadyIn.includes(m.name);
            return (
              <button
                key={m.name}
                onClick={() => onPick(m.name)}
                disabled={inUse}
                className={
                  "flex items-center gap-3 px-4 py-3 min-h-[56px] rounded-2xl border transition text-left " +
                  (inUse
                    ? "bg-panel-dark border-border opacity-50 cursor-not-allowed"
                    : "bg-panel border-border active:bg-panel-dark")
                }
              >
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-ink shrink-0"
                  style={{ background: MUSCLE_COLORS[m.primary] }}
                >
                  {m.name[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink flex items-center gap-2">
                    {titleCase(m.name)}
                    {isTracked(m.name) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
                        CAM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-dark truncate">
                    {m.primary} · {m.equipment}
                  </div>
                </div>
                {inUse && <span className="text-xs text-gray-dark shrink-0">Added</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
