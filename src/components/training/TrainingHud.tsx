// Everything drawn over the camera feed: top bar, status pills, rep bar.
// Split out of Training so that file is orchestration rather than markup.

import { BackIcon } from "@/components/icons";
import { MenuIcon, Pill, RoundButton } from "./ui";

export function TopBar({ setIdx, unilateral, side, onBack, onMenu }: {
  setIdx: number; unilateral: boolean; side: "left" | "right";
  onBack(): void; onMenu(): void;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <RoundButton onClick={onBack} label="Back to menu">
        <BackIcon size={20} />
      </RoundButton>
      <div className="text-white font-bold text-lg drop-shadow">
        Set {setIdx + 1}
        {unilateral && (
          <span className="font-semibold opacity-80">
            {side === "right" ? " · Right" : " · Left"}
          </span>
        )}
      </div>
      <RoundButton onClick={onMenu} label="Workout controls">
        <MenuIcon />
      </RoundButton>
    </div>
  );
}

/** Status pills — only for states the user must act on. */
export function StatusPills({ camError, mpError, mpReady, lowPerf, tracked }: {
  camError: string | null; mpError: string | null;
  mpReady: boolean; lowPerf: boolean; tracked: boolean;
}) {
  return (
    <div
      className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
      style={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}
    >
      {camError && <Pill tone="error">Camera error: {camError}</Pill>}
      {mpError && <Pill tone="error">Pose model error: {mpError}</Pill>}
      {tracked && !mpReady && !mpError && (
        <Pill tone="neutral">Loading pose model…</Pill>
      )}
      {lowPerf && mpReady && (
        <Pill tone="warn">Low performance — reduced tracking quality</Pill>
      )}
      {!tracked && (
        <Pill tone="neutral">Manual mode — tap the counter when done</Pill>
      )}
    </div>
  );
}

export function RepBar({ reps, target, amrap, pulseKey, onEndSet }: {
  reps: number; target: number; amrap: boolean; pulseKey: string;
  onEndSet(): void;
}) {
  return (
    <button
      onClick={onEndSet}
      className="absolute inset-x-0 bottom-0 px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      aria-label="End this set"
    >
      {/* `key` on the bar replays the pulse whenever a set boundary is
          crossed (completed, or arm switched — both reset reps to 0). */}
      <div
        key={pulseKey}
        className="bg-accent rounded-full px-5 py-3 flex items-center gap-3 shadow-lg animate-pulse-once will-change-transform"
      >
        <div className="text-on_accent font-extrabold text-2xl leading-none shrink-0">
          {/* Remounting on every rep restarts the pop animation — the
              cheapest way to replay a CSS keyframe in React. */}
          <span key={reps} className="inline-block animate-pop will-change-transform">
            {reps}
          </span>
          <span className="text-base font-bold opacity-80">
            {amrap ? "+" : `/${target}`}
          </span>
        </div>
        <RepSegments done={reps} target={target} amrap={amrap} />
      </div>
    </button>
  );
}

function RepSegments({ done, target, amrap }: {
  done: number; target: number; amrap: boolean;
}) {
  // AMRAP has no ceiling, so the bar cycles every 10 reps rather than trying
  // to render an unbounded number of segments.
  const count = amrap ? 10 : target;
  const filled = amrap ? done % 10 : done;
  return (
    <div className="flex gap-1.5 flex-1 min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        // Always the same fill colour, toggled by opacity rather than
        // swapping background-color: opacity is composited, so the fill
        // animates without a paint on the inference thread's critical path.
        <div
          key={i}
          className={
            "flex-1 h-4 rounded-full min-w-0 bg-on_accent transition-opacity duration-200 " +
            (i < filled ? "opacity-100" : "opacity-30")
          }
        />
      ))}
    </div>
  );
}
