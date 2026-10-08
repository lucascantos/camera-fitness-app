// Pieces of an exercise's detail card. Every bar grows from zero the first
// time its card comes into focus (`run`), staggered left to right; `instant`
// skips straight to the final state.

import type { DetailSet, TrendPoint } from "./detail";

const grow = (run: boolean, i: number, instant: boolean): React.CSSProperties => ({
  transform: `scaleY(${run ? 1 : 0})`,
  transition: instant ? "none" : `transform 600ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 90}ms`,
});

/** One bar per set: reps against the target, green when it was hit. */
export function SetBars({ sets, run, instant }: {
  sets: DetailSet[]; run: boolean; instant: boolean;
}) {
  return (
    <div className="flex items-end gap-2 h-32">
      {sets.map((s, i) => {
        const frac = s.target > 0 ? Math.min(1, s.reps / s.target) : 1;
        return (
          <div key={i} className="flex-1 max-w-14 h-full flex flex-col items-center justify-end min-w-0">
            <div className="text-sm font-black text-ink tabular-nums">
              {s.reps}{s.amrap && "+"}
            </div>
            <div className="w-full flex-1 flex items-end mt-1">
              <div
                className={"w-full rounded-lg origin-bottom " + (s.hit ? "bg-good" : s.reps > 0 ? "bg-accent" : "bg-ink/15")}
                style={{ height: `${Math.max(6, frac * 100)}%`, ...grow(run, i, instant) }}
              />
            </div>
            <div className="text-[10px] font-bold text-gray-dark mt-1 truncate max-w-full">
              {s.weight > 0 ? `${s.weight}kg` : `/${s.target}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Volume per session, oldest first; today's bar in the accent colour. */
export function Trend({ points, unit, run, instant }: {
  points: TrendPoint[]; unit: "kg" | "reps"; run: boolean; instant: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div>
      <div className="flex items-end gap-1.5 h-20">
        {points.map((p, i) => (
          <div key={i} className="flex-1 h-full flex items-end">
            <div
              className={"w-full rounded-md origin-bottom " + (p.today ? "bg-accent" : "bg-ink/20")}
              style={{ height: `${Math.max(4, (p.value / max) * 100)}%`, ...grow(run, i, instant) }}
              title={`${Math.round(p.value)} ${unit}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {points.map((p, i) => (
          <div key={i} className={"flex-1 text-center text-[9px] font-bold truncate " + (p.today ? "text-accent" : "text-gray-dark")}>
            {p.today ? "TODAY" : shortDate(p.date)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Tile({ label, value, sub, star }: {
  label: string; value: string; sub?: React.ReactNode; star?: boolean;
}) {
  return (
    <div className="bg-panel-dark rounded-2xl p-3 min-w-0">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">{label}</div>
      <div className="text-xl font-black text-ink mt-0.5 truncate">
        {value}{star && <span className="text-coin"> ★</span>}
      </div>
      {sub && <div className="text-xs font-bold mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${Number(d)}/${Number(m)}` : "";
}
