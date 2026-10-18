// First-launch onboarding: a white screen where each line types itself out,
// then offers whatever the step needs (a tap, a choice, or the body inputs).
// Shown only when nothing is saved yet (settings.onboarded is false); nothing
// is written until the last step, so quitting halfway starts over next time.
// It ends by offering the Calibration session (src/data/plans/calibration.ts).
// See docs/guided-mode-design.md §2.

import { useEffect, useRef, useState } from "react";
import { updateSettings, type Goal } from "@/data/settings/settings";
import { recordMeasurement } from "@/data/body/body";
import { splashGone } from "@/splash";
import { Typed, useTyped } from "./Typewriter";
import { NumberStepper } from "./NumberStepper";

type Step =
  | { kind: "message"; line: string }
  | { kind: "goal"; line: string }
  | { kind: "days"; line: string }
  | { kind: "body"; line: string }
  | { kind: "calibrate"; line: string };

const STEPS: Step[] = [
  { kind: "message", line: "Welcome to the Camera Fit. Together we'll achieve your fitness goals!" },
  { kind: "message", line: "Before we start, let's do a quick *body test*." },
  { kind: "message", line: "I need to know some things to prepare the best plan for you." },
  { kind: "goal",    line: "To start off, could you tell me what is your *goal*?" },
  { kind: "days",    line: "How many *days a week* would you like to train?" },
  { kind: "body",    line: "Last thing: your *body weight* and *waist size*." },
  { kind: "message", line: "I've got your *workout plan* ready," },
  { kind: "calibrate", line: "But before we jump into that, how about having 1 *calibration session*?" },
];

const GOALS: { id: Goal; label: string }[] = [
  { id: "strength",    label: "To get stronger" },
  { id: "weight_loss", label: "To lose weight" },
  { id: "health",      label: "To be healthier" },
];
const DAYS = [3, 4, 5];

/** `calibrate` is true when the athlete chose to start the calibration session. */
export function Onboarding({ onDone }: { onDone(calibrate: boolean): void }) {
  const [idx, setIdx] = useState(0);
  const [goal, setGoal] = useState<Goal>("strength");
  const [days, setDays] = useState(3);
  const [weight, setWeight] = useState(70);
  const [waist, setWaist] = useState(80);
  // Waist is optional and starts hidden: plenty of people don't know theirs
  // offhand. "Add it" opens the field; "Skip waist size" hides it again.
  const [skipWaist, setSkipWaist] = useState(true);
  // Hold the first line until the opening splash is off screen.
  const [visible, setVisible] = useState(false);
  useEffect(() => { void splashGone.then(() => setVisible(true)); }, []);

  const next = () => setIdx((i) => i + 1);
  const finish = async (calibrate: boolean) => {
    await recordMeasurement("weight_kg", weight);
    if (!skipWaist) await recordMeasurement("waist_cm", waist);
    await updateSettings({ goal, weeklyGoal: days, onboarded: true });
    onDone(calibrate);
  };

  const step = STEPS[idx];
  return (
    <div className="fixed inset-0 z-50 bg-white safe-area">
      {visible && <StepView
        key={idx}
        step={step}
        onNext={next}
        choices={
          step.kind === "goal" ? (
            <div className="flex flex-col gap-3">
              {GOALS.map((g) => (
                <BigChoice key={g.id} onClick={() => { setGoal(g.id); next(); }}>{g.label}</BigChoice>
              ))}
            </div>
          ) : step.kind === "days" ? (
            <div className="flex gap-3">
              {DAYS.map((d) => (
                <BigChoice key={d} onClick={() => { setDays(d); next(); }}>{d}</BigChoice>
              ))}
            </div>
          ) : step.kind === "body" ? (
            <div className="flex flex-col gap-5">
              <NumberStepper label="Body weight" unit="kg" value={weight} min={30} max={250} onChange={setWeight} />
              {skipWaist ? (
                <div className="rounded-3xl border-2 border-dashed border-border px-5 py-4 flex items-center justify-between">
                  <span className="font-bold text-ink">Waist size</span>
                  <button onClick={() => setSkipWaist(false)} className="font-bold text-accent min-h-[44px] px-2">
                    Add it
                  </button>
                </div>
              ) : (
                <div>
                  <NumberStepper label="Waist size" unit="cm" value={waist} min={40} max={200} onChange={setWaist} />
                  <button
                    onClick={() => setSkipWaist(true)}
                    className="mt-2 min-h-[44px] text-sm font-bold text-gray-dark underline underline-offset-4"
                  >
                    Skip waist size
                  </button>
                </div>
              )}
              <button
                onClick={next}
                className="w-full bg-accent text-on_accent font-extrabold py-4 rounded-2xl text-lg active:bg-accent-hov transition"
              >
                Let's go
              </button>
            </div>
          ) : step.kind === "calibrate" ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => finish(true)}
                className="w-full bg-accent text-on_accent font-extrabold py-4 rounded-2xl text-lg active:bg-accent-hov transition"
              >
                Start session
              </button>
              <BigChoice onClick={() => finish(false)}>Skip</BigChoice>
            </div>
          ) : null
        }
      />}
    </div>
  );
}

/** One line typing out; once done, its choices fade in (or a tap moves on). */
function StepView({ step, onNext, choices }: {
  step: Step; onNext(): void; choices: React.ReactNode;
}) {
  const [skip, setSkip] = useState(false);
  const [typed, setTyped] = useState(false);
  const shown = useTyped(step.line, skip, () => setTyped(true));
  const isMessage = step.kind === "message";
  const advanced = useRef(false);

  // A tap while typing finishes the line; on a message line it then moves on
  // — once only, so a quick double tap can't skip the next question.
  const onTap = () => {
    if (!typed) setSkip(true);
    else if (isMessage && !advanced.current) { advanced.current = true; onNext(); }
  };

  return (
    <div className="h-full max-w-lg mx-auto flex flex-col px-6 pt-[18vh] pb-8 overflow-y-auto" onClick={onTap}>
      <Typed script={step.line} shown={shown} />
      {typed && (
        <div className="mt-10 animate-fade-in" onClick={(e) => { if (!isMessage) e.stopPropagation(); }}>
          {choices}
        </div>
      )}
      {typed && isMessage && (
        <div className="mt-auto text-center text-sm font-semibold text-gray-dark animate-fade-in">
          Tap to continue
        </div>
      )}
    </div>
  );
}

function BigChoice({ onClick, children }: { onClick(): void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-h-[64px] rounded-2xl border-2 border-border bg-white text-ink text-xl font-extrabold px-5 active:border-accent active:text-accent transition"
    >
      {children}
    </button>
  );
}
