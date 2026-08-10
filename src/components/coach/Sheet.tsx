// The recap, after the coach has talked it through. Kept short on purpose:
// the explanation already happened out loud, so this is just the thing you'd
// pin to the fridge.

import { CoachAvatar } from "@/components/trainer/CoachAvatar";
import { STEPS, labelFor, type ConsultAnswers } from "@/data/consult/consult";

export function Sheet({ answers, onDone, onRedo }: {
  answers: ConsultAnswers;
  onDone: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="h-full overflow-auto bg-nav text-white animate-fade-in">
      <div className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CoachAvatar size={52} />
          <div>
            <div className="text-[11px] font-bold tracking-widest text-white/50">
              SIGNED OFF BY COACH
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">Your plan</h1>
          </div>
        </div>

        <div className="bg-panel text-ink rounded-3xl p-5 border border-border">
          <div className="flex flex-col divide-y divide-border">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between py-2.5 gap-4">
                <span className="text-sm font-bold tracking-wide text-gray-dark uppercase shrink-0">
                  {s.title}
                </span>
                <span className="font-extrabold text-lg text-ink text-right">
                  {labelFor(s.id, answers[s.id])}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onDone}
          className="w-full min-h-[56px] bg-accent text-on_accent font-bold rounded-2xl text-lg active:bg-accent-hov transition"
        >
          Let's train
        </button>
        <button
          onClick={onRedo}
          className="w-full min-h-[48px] text-white/50 font-bold rounded-2xl active:text-white transition"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
