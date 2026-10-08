// End-of-set dialog — the confirm step between the rep bar and the actuals
// that get written into the session. Opens on its own when the camera count
// reaches the target, or when the rep bar is tapped. The athlete's own count
// is what gets saved: the camera proposes, the athlete decides.

import { useState } from "react";
import { Backdrop, Stepper } from "./ui";

export function SetSheet({
  reps, target, amrap, showSwitchArm, onSwitchArm, onComplete, onSkip, onClose,
}: {
  reps: number; target: number; amrap: boolean;
  showSwitchArm: boolean; onSwitchArm(): void;
  onComplete(actual: number): void; onSkip(): void; onClose(): void;
}) {
  // Seeded with the camera's count so the common case ("it was right") is one
  // tap, and only corrections cost anything. Doubles as the ground-truth label
  // for the diagnostics log.
  const [actual, setActual] = useState(reps);
  return (
    <Backdrop onClose={onClose}>
      <div
        className="bg-panel rounded-3xl p-6 w-full max-w-sm shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-xl font-extrabold text-ink">
            {!amrap && reps >= target ? "Set done!" : "End this set?"}
          </div>
          <div className="text-gray-dark mt-1">
            Camera counted {reps} {amrap ? "reps" : `of ${target}`}
          </div>
        </div>

        <div className="mt-4">
          <Stepper
            label="HOW MANY REPS DID YOU DO?"
            value={String(actual)}
            suffix=""
            onMinus={() => setActual((v) => Math.max(0, v - 1))}
            onPlus={() => setActual((v) => v + 1)}
          />
        </div>

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
            onClick={() => onComplete(actual)}
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
