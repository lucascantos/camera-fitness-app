// "How hard was that set?" — a five-segment gauge on both rest screens, saved
// on the set just finished (SetActuals.effort → history) as a 0–10 score
// with one decimal. Tap or drag anywhere along it: the gauge fills up to that
// exact point, segment by segment from light blue to red, partly filling the
// segment the finger is in. 10 means nothing left in the tank.

import { useRef, useState } from "react";
import type { Effort, Session } from "@/data/plans/plans";
import { recordEffort } from "@/components/training/session";

const MAX = 10;
const SEGMENTS = 5;
const PER = MAX / SEGMENTS;            // each segment spans 2 points
// Light blue → red. Fixed colours: the gauge reads the same in both themes.
const COLORS = ["#7cc8f8", "#5fd0a8", "#f5c542", "#f5893a", "#e0323e"];

const round1 = (v: number) => Math.round(Math.min(MAX, Math.max(0, v)) * 10) / 10;

/** Rates set `si` of exercise `wi`; renders nothing if that set has no result. */
export function EffortRow({ session, wi, si }: { session: Session; wi: number; si: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  // While a finger is on the gauge, show its position; save on release.
  const [dragging, setDragging] = useState<Effort | null>(null);
  const actuals = session.workouts[wi]?.sets[si]?.[3];
  if (!actuals) return null;

  const saved = actuals.effort;
  const value = dragging ?? saved;

  /** Score under the finger, measured per segment so the gaps don't skew it. */
  const valueAt = (x: number): Effort => {
    const segs = [...barRef.current!.children].map((c) => c.getBoundingClientRect());
    for (let i = 0; i < segs.length; i++) {
      const r = segs[i];
      if (x < r.left) return round1(i * PER);                       // in the gap before it
      if (x <= r.right) return round1((i + (x - r.left) / r.width) * PER);
    }
    return MAX;
  };
  const save = (v: Effort) => recordEffort(session, wi, si, round1(v));
  const dotColor = value === undefined ? undefined : COLORS[Math.min(SEGMENTS - 1, Math.floor(value / PER))];

  return (
    <div className="bg-panel rounded-3xl p-5 border border-border shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">HOW HARD WAS THAT SET?</div>
        <div className="flex items-center gap-1.5 shrink-0">
          {value === undefined ? (
            <span className="text-sm font-extrabold text-gray">Tap to rate</span>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full self-center" style={{ background: dotColor }} />
              <span className="text-2xl font-black text-ink tabular-nums leading-none">{value.toFixed(1)}</span>
              <span className="text-xs font-bold text-gray-dark">/ 10</span>
            </>
          )}
        </div>
      </div>

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="How hard was that set? 0 very easy to 10 very hard"
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={saved}
        aria-valuetext={saved === undefined ? "Not rated" : `${saved.toFixed(1)} out of 10`}
        className="mt-3 flex gap-1 h-11 cursor-pointer select-none touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(valueAt(e.clientX)); }}
        onPointerMove={(e) => { if (dragging !== null) setDragging(valueAt(e.clientX)); }}
        onPointerUp={(e) => { save(valueAt(e.clientX)); setDragging(null); }}
        onPointerCancel={() => setDragging(null)}
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5
            : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : 0;
          if (step) { e.preventDefault(); save((saved ?? 0) + step); }
        }}
      >
        {COLORS.map((color, i) => {
          const fill = value === undefined ? 0 : Math.min(1, Math.max(0, value / PER - i));
          return (
            <div
              key={color}
              className={
                "flex-1 bg-panel-dark overflow-hidden " +
                (i === 0 ? "rounded-l-full " : "") + (i === SEGMENTS - 1 ? "rounded-r-full" : "")
              }
            >
              <div className="h-full" style={{ width: `${fill * 100}%`, background: color }} />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-1.5 text-[11px] font-bold text-gray-dark">
        <span>Very easy</span>
        <span>Very hard</span>
      </div>
    </div>
  );
}
