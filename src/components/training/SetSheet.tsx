// "End this set?" dialog — the confirm step between the rep bar and the
// actuals that get written into the session.

import { useState } from "react";
import { Backdrop, Stepper } from "./ui";

export function SetSheet({
  reps, target, amrap, showSwitchArm, onSwitchArm, onComplete, onSkip, onClose, askActual,
}: {
  reps: number; target: number; amrap: boolean;
  showSwitchArm: boolean; onSwitchArm(): void;
  onComplete(actual: number | null): void; onSkip(): void; onClose(): void;
  askActual: boolean;
}) {
  // Ground truth for the diagnostics log. Seeded with the tracker's count so
  // the common case ("it was right") is one tap, and only the corrections cost
  // the user anything.
  const [actual, setActual] = useState(reps);
  return (
    <Backdrop onClose={onClose}>
      <div
        className="bg-panel rounded-3xl p-6 w-full max-w-sm shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-xl font-extrabold text-ink">End this set?</div>
          <div className="text-gray-dark mt-1">
            {reps} {amrap ? "reps done" : `of ${target} reps done`}
          </div>
        </div>

        {askActual && (
          <div className="mt-4">
            <Stepper
              label="HOW MANY DID YOU ACTUALLY DO?"
              value={String(actual)}
              suffix={actual === reps ? "· matches" : `· counted ${reps}`}
              onMinus={() => setActual((v) => Math.max(0, v - 1))}
              onPlus={() => setActual((v) => v + 1)}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {showSwitchArm && (
            <button
              onClick={onSwitchArm}
              className="w-full py-3.5 rounded-2xl font-bold bg-good text-on_accent"
            >
              ⇄ Switch arm
            </button>
          )}
          <button
            onClick={() => onComplete(askActual ? actual : null)}
            className="w-full py-3.5 rounded-2xl font-bold bg-nav text-white"
          >
            ✓ Complete Set
          </button>
          {/* Skip records the set as 0 reps, so progression scores it as a
              miss rather than silently crediting the full prescription. */}
          <button
            onClick={onSkip}
            className="w-full py-3.5 rounded-2xl font-bold bg-panel text-gray-dark border border-border"
          >
            Skip Set
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
