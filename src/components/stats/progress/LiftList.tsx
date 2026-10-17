// The Progress tab's per-lift card: for each exercise trained in the range,
// whether it's up since the range began (same verdict as the Session Summary)
// and a dot per session showing how each one compared with the one before.

import type { LiftRow, SessionDot } from "@/data/stats/liftVerdicts";
import type { VerdictKind } from "@/data/stats/verdict";
import { VerdictLine } from "@/components/complete/VerdictLine";
import { fmtDate } from "@/data/stats/dates";
import { titleCase } from "@/lib/format";

/** Dots shown per lift, newest last — enough to read a streak on a phone. */
const MAX_DOTS = 8;

const DOT: Record<VerdictKind | "first", string> = {
  progress: "bg-good",
  holding:  "bg-ink/40",
  below:    "bg-gray-dark/25",
  first:    "bg-coin",
};

export function LiftList({ rows }: { rows: LiftRow[] }) {
  return (
    <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-1">LIFTS</div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-dark mt-2">No lifts in this range yet.</div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {rows.map((r) => <Row key={r.exercise} row={r} />)}
          </div>
          <Legend />
        </>
      )}
    </div>
  );
}

function Row({ row }: { row: LiftRow }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold text-ink truncate">{titleCase(row.exercise)}</div>
        <Dots dots={row.dots.slice(-MAX_DOTS)} />
      </div>
      <div className="text-xs font-bold mt-1 truncate">
        {row.verdict ? (
          <>
            <VerdictLine verdict={row.verdict} />
            {row.since && <span className="text-gray-dark font-semibold"> · since {fmtDate(row.since)}</span>}
          </>
        ) : (
          <span className="text-gray-dark font-semibold">One session so far</span>
        )}
      </div>
    </div>
  );
}

function Dots({ dots }: { dots: SessionDot[] }) {
  return (
    <div className="flex gap-1 shrink-0">
      {dots.map((d, i) => (
        <span
          key={i}
          title={`${fmtDate(d.date)} · ${d.reason}`}
          className={"w-2.5 h-2.5 rounded-full " + DOT[d.kind ?? "first"]}
        />
      ))}
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    [DOT.progress, "Beat last time"], [DOT.holding, "Held"], [DOT.below, "Dipped"],
    [DOT.first, "First time"],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-dark">
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={"w-2 h-2 rounded-full " + cls} /> {label}
        </span>
      ))}
    </div>
  );
}
