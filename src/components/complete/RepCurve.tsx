// The average rep: mean joint angle through one rep, with a shaded band of
// ± one standard deviation (narrow = consistent reps). The line draws itself
// on when the card comes into focus. A dashed marker at the turning point
// splits the rep into its two halves, labelled with the tempo below.

import type { RepMotion } from "./motion";

const W = 300;
const H = 110;
const PAD = 8;

export function RepCurve({ m, run, instant }: { m: RepMotion; run: boolean; instant: boolean }) {
  const lo = Math.min(...m.lo);
  const hi = Math.max(...m.hi);
  const span = Math.max(10, hi - lo);
  const x = (k: number) => (k / (m.curve.length - 1)) * W;
  const y = (deg: number) => PAD + (1 - (deg - lo) / span) * (H - 2 * PAD);

  const line = m.curve.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const band =
    m.hi.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("") +
    m.lo.map((_, k) => {
      const i = m.lo.length - 1 - k;
      return `L${x(i).toFixed(1)},${y(m.lo[i]).toFixed(1)}`;
    }).join("") + "Z";

  const turn = m.repSec > 0 ? m.firstSec / m.repSec : 0.5;
  const ease = "cubic-bezier(0.22,1,0.36,1)";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" preserveAspectRatio="none">
        <path
          d={band}
          className="fill-accent/15"
          style={{ opacity: run ? 1 : 0, transition: instant ? "none" : `opacity 600ms ease 500ms` }}
        />
        <line
          x1={turn * W} x2={turn * W} y1={0} y2={H}
          className="stroke-ink/25" strokeWidth={1.5} strokeDasharray="4 4"
        />
        <path
          d={line}
          pathLength={1}
          fill="none"
          className="stroke-accent"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: run ? 0 : 1,
            transition: instant ? "none" : `stroke-dashoffset 1200ms ${ease} 150ms`,
          }}
        />
      </svg>
      <div className="flex mt-1.5 text-xs font-bold">
        <div className="text-center text-ink" style={{ width: `${turn * 100}%` }}>
          {m.firstLabel} <span className="tabular-nums">{m.firstSec.toFixed(1)}s</span>
        </div>
        <div className="text-center text-ink flex-1">
          {m.secondLabel} <span className="tabular-nums">{m.secondSec.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}
