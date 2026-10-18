// The rest countdown card shared by both rest screens (between sets and
// between exercises): the seconds left, a quiet grey Skip beside them, and
// the draining bar. Skip is secondary on purpose — resting is the point — so
// it has to be held for a second (HoldButton). Where rest doesn't
// auto-advance (between exercises), the timer stops at 0 and the button
// becomes the main action: "Start", a plain tap.

import { HoldButton } from "./HoldButton";

export function RestTimer({ remaining, duration, onSkip }: {
  remaining: number; duration: number; onSkip(): void;
}) {
  const pct = Math.max(0, (remaining / duration) * 100);
  const over = remaining <= 0;
  return (
    <div className="bg-panel rounded-3xl p-6 border border-border shadow-card">
      <div className="text-accent text-xl font-extrabold tracking-wide">REST</div>
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <div className="text-[5rem] font-black leading-none text-ink tabular-nums">{remaining}</div>
          <div className="text-gray-dark text-lg">{over ? "Rest over" : "sec"}</div>
        </div>
        {over ? (
          <button
            onClick={onSkip}
            className="shrink-0 font-bold px-5 min-h-[48px] rounded-2xl bg-accent text-on_accent active:bg-accent-hov animate-pop transition"
          >
            Start →
          </button>
        ) : (
          <HoldButton
            onHold={onSkip}
            className="shrink-0 font-bold px-4 min-h-[48px] rounded-2xl bg-panel-dark text-gray-dark leading-tight"
          >
            Hold to skip
          </HoldButton>
        )}
      </div>
      <div className="mt-4 h-3 bg-panel-dark rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
