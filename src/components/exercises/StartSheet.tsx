// Pick sets & reps before a standalone session begins.

import { useState } from "react";
import { useDismissable } from "@/hooks/useDismissable";
import { titleCase } from "@/lib/format";

/** Volume the sheet opens on, and the clamps its steppers respect. */
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 12;
const SETS_RANGE = [1, 10] as const;
const REPS_RANGE = [1, 50] as const;

export function StartSheet({ exercise, onStart, onClose }: {
  exercise: string;
  onStart(sets: number, reps: number): void;
  onClose(): void;
}) {
  const [sets, setSets] = useState(DEFAULT_SETS);
  const [reps, setReps] = useState(DEFAULT_REPS);
  const { closing, dismiss } = useDismissable(onClose);

  const clamp = (v: number, [lo, hi]: readonly [number, number]) =>
    Math.min(hi, Math.max(lo, v));

  return (
    <div
      className={
        "fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center " +
        (closing ? "animate-fade-out" : "animate-fade-in")
      }
      onClick={dismiss}
    >
      <div
        className={
          "w-full sm:max-w-[420px] bg-bg sm:bg-panel rounded-t-3xl sm:rounded-3xl sm:border sm:border-border sm:shadow-card " +
          (closing ? "animate-sheet-down sm:animate-fade-out" : "animate-sheet-up sm:animate-fade-in")
        }
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 grid place-items-center sm:hidden">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pt-2 pb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              START
            </div>
            <h2 className="text-xl font-extrabold text-ink truncate">
              {titleCase(exercise)}
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="w-9 h-9 shrink-0 rounded-full bg-panel border border-border grid place-items-center text-gray-dark text-xl leading-none"
            aria-label="Cancel"
          >
            ×
          </button>
        </div>

        <div className="px-5 mt-4 flex gap-2">
          <Stepper
            label="sets"
            value={sets}
            onChange={(d) => setSets((v) => clamp(v + d, SETS_RANGE))}
          />
          <Stepper
            label="reps"
            value={reps}
            onChange={(d) => setReps((v) => clamp(v + d, REPS_RANGE))}
          />
        </div>

        <div className="px-5 mt-2 text-xs text-gray-dark">
          {sets} × {reps} — {sets * reps} reps total
        </div>

        <div className="px-5 mt-4">
          <button
            onClick={() => onStart(sets, reps)}
            className="w-full min-h-[56px] rounded-2xl font-bold text-lg bg-accent text-on_accent active:bg-accent-hov transition"
          >
            Start workout
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange }: {
  label: string; value: number; onChange(delta: number): void;
}) {
  return (
    <div className="flex-1 flex items-center justify-between bg-panel-dark rounded-full p-1">
      <button
        onClick={() => onChange(-1)}
        className="w-11 h-11 rounded-full bg-panel text-ink text-xl grid place-items-center shrink-0"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="flex flex-col items-center leading-tight px-1 min-w-0">
        <span className="font-extrabold text-ink text-lg">{value}</span>
        <span className="text-[10px] text-gray-dark">{label}</span>
      </span>
      <button
        onClick={() => onChange(+1)}
        className="w-11 h-11 rounded-full bg-nav text-white text-xl grid place-items-center shrink-0"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
