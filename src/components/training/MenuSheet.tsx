// Bottom sheet behind the ☰ button: set progress, weight/rest tuning, a way
// into Settings, and the end-workout escape hatch.

import { useState } from "react";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { GearIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";
import { Backdrop, Stepper } from "./ui";

export function MenuSheet({
  exercise, setIdx, totalSets, weight, onWeight, onEndWorkout, onSettings, onClose,
}: {
  exercise: string; setIdx: number; totalSets: number; weight: number;
  onWeight(fn: (v: number) => number): void;
  onEndWorkout(): void; onSettings(): void; onClose(): void;
}) {
  const [, force] = useState({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const step = getSettings().weightStep;

  return (
    <Backdrop onClose={onClose} align="bottom">
      <div
        className="bg-panel rounded-t-3xl p-5 w-full max-w-lg"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-ink truncate">
            {titleCase(exercise)}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-panel-dark text-gray-dark grid place-items-center shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 bg-panel-dark rounded-2xl p-3">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            SET {setIdx + 1} OF {totalSets}
          </div>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div
                key={i}
                className={
                  "flex-1 h-9 rounded-lg grid place-items-center font-bold text-sm " +
                  (i === setIdx ? "bg-accent text-on_accent"
                    : i < setIdx ? "bg-good text-on_accent"
                    : "bg-panel text-gray-dark")
                }
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <Stepper
          label="WEIGHT"
          value={weight === 0 ? "bodyweight" : String(weight)}
          suffix={weight === 0 ? "" : "kg"}
          onMinus={() => { onWeight((v) => Math.max(0, v - step)); force({}); }}
          onPlus={() => { onWeight((v) => Math.min(500, v + step)); force({}); }}
        />
        <Stepper
          label="REST"
          value={String(getSettings().restSeconds)}
          suffix="s"
          onMinus={async () => {
            await updateSettings({ restSeconds: Math.max(5, getSettings().restSeconds - 15) });
            force({});
          }}
          onPlus={async () => {
            await updateSettings({ restSeconds: Math.min(600, getSettings().restSeconds + 15) });
            force({});
          }}
        />

        <button
          onClick={onSettings}
          className="mt-3 w-full py-3.5 rounded-2xl font-bold text-ink bg-panel-dark flex items-center justify-center gap-2"
        >
          <GearIcon />
          Settings
        </button>

        {confirmEnd ? (
          <div className="mt-4 rounded-2xl border border-accent bg-accent/10 p-3">
            <div className="text-sm font-bold text-ink">
              End the workout? Unfinished sets won’t be recorded.
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onEndWorkout}
                className="flex-1 py-3 rounded-2xl font-bold bg-accent text-on_accent"
              >
                End workout
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 py-3 rounded-2xl font-bold bg-panel text-gray-dark border border-border"
              >
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="mt-4 w-full py-3 rounded-2xl font-bold text-accent border border-border"
          >
            End workout
          </button>
        )}
      </div>
    </Backdrop>
  );
}
