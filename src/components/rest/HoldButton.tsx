// A button that only fires after being held for HOLD_MS — for skipping rest,
// which a stray tap shouldn't do. While held, an outline draws itself around
// the button: fast at first, easing out, complete at exactly HOLD_MS (the
// timer, not the animation, decides when it fires). Letting go early snaps the
// outline back and nothing happens.

import { useRef, useState, type ReactNode } from "react";

const HOLD_MS = 1000;
// easeOutQuad: quick start, slow finish, but still visibly filling right up
// to the end (≈75% at half time) so it reads as a full second.
const FILL_EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

export function HoldButton({ onHold, className = "", children }: {
  onHold(): void; className?: string; children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const start = () => {
    clearTimeout(timer.current);
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      navigator.vibrate?.(15);
      onHold();
    }, HOLD_MS);
  };
  const cancel = () => { clearTimeout(timer.current); setHolding(false); };

  return (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); start(); }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}   // long-press menu on mobile
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") cancel(); }}
      className={"relative select-none touch-none [-webkit-touch-callout:none] " + className}
    >
      {children}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" aria-hidden="true">
        <rect
          x="0" y="0" width="100%" height="100%" rx="16" ry="16"
          pathLength={1}
          fill="none"
          className="stroke-accent"
          strokeWidth={3}
          strokeDasharray="1 1"
          style={{
            strokeDashoffset: holding ? 0 : 1,
            transition: holding
              ? `stroke-dashoffset ${HOLD_MS}ms ${FILL_EASE}`
              : "stroke-dashoffset 150ms ease-in",
          }}
        />
      </svg>
    </button>
  );
}
