// The start of every set: time to place the phone, then a 3-2-1 countdown.
//
// The camera feed and skeleton stay visible behind this overlay — the whole
// point of the setup phase is to see yourself while you move the phone — but
// the rep tracker is fed nothing until the countdown ends, so walking back
// into shot can't count reps or skew the range the tracker adapts to.

import { useEffect, useState } from "react";
import { countdownBeep } from "@/audio/sfx";

/**
 * setup     — placing the phone; nothing is tracked
 * countdown — 3, 2, 1; still nothing is tracked
 * go        — "GO!" on screen; tracking has started
 * live      — overlay gone; the set is under way
 */
export type SetPhase = "setup" | "countdown" | "go" | "live";

const STEPS = ["3", "2", "1", "GO!"] as const;
const STEP_MS = 1000;

export function SetStart({ phase, onReady, onGo, onDone }: {
  phase: SetPhase;
  onReady(): void;
  /** Called the moment "GO!" appears — tracking starts here. */
  onGo(): void;
  /** Called once "GO!" has finished animating out. */
  onDone(): void;
}) {
  if (phase === "live") return null;
  if (phase === "setup") return <Setup onReady={onReady} />;
  return <Countdown onGo={onGo} onDone={onDone} />;
}

function Setup({ onReady }: { onReady(): void }) {
  return (
    <>
      <div className="absolute inset-x-0 top-1/3 px-6 flex justify-center pointer-events-none animate-fade-in">
        <div className="bg-black/55 backdrop-blur rounded-2xl px-5 py-3 text-white text-xl font-bold text-center">
          Please adjust the camera.
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 px-4 animate-fade-in"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <button
          onClick={onReady}
          className="w-full bg-accent text-on_accent font-extrabold text-2xl rounded-full py-4 shadow-lg active:scale-[0.98] transition-transform"
        >
          Ready!
        </button>
      </div>
    </>
  );
}

function Countdown({ onGo, onDone }: { onGo(): void; onDone(): void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const last = step === STEPS.length - 1;
    countdownBeep(last);
    if (last) onGo();
    const id = setTimeout(() => (last ? onDone() : setStep(step + 1)), STEP_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const label = STEPS[step];

  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      {/* Keyed on the step so each number remounts and replays the animation. */}
      <div
        key={step}
        className={
          "font-black leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] animate-count-in will-change-transform " +
          (label === "GO!" ? "text-[7rem] text-good" : "text-[10rem] text-white")
        }
      >
        {label}
      </div>
    </div>
  );
}
