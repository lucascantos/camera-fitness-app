// One exercise's page in the Session Summary carousel: how each set went,
// today against last time, and where today sits in the longer trend. Built to
// answer "am I progressing?" at a glance, same as the summary card.

import { useEffect, useState } from "react";
import { titleCase } from "@/lib/format";
import { changePct, type SummaryRow } from "./summary";
import { formatTop } from "./detail";
import { SetBars, Tile, Trend } from "./detailParts";
import { RepCurve } from "./RepCurve";

export function DetailCard({ row, active, instant }: {
  row: SummaryRow;
  /** In focus — starts the bars growing (once). */
  active: boolean;
  instant: boolean;
}) {
  const [run, setRun] = useState(instant);
  useEffect(() => {
    if (!active || run) return;
    const id = setTimeout(() => setRun(true), 60);
    return () => clearTimeout(id);
  }, [active, run]);

  const d = row.detail;
  const pct = changePct(row);
  const fmt = (v: number) => `${Math.round(v).toLocaleString()} ${row.unit}`;

  return (
    <div className="bg-panel rounded-3xl p-5 border border-border shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-black text-ink leading-tight">{titleCase(row.exercise)}</h2>
        {row.best && (
          <div className="shrink-0 bg-coin text-white text-xs font-extrabold tracking-wide rounded-full px-2.5 py-1">
            {row.best === "weight" ? "★ NEW BEST" : "★ REP BEST"}
          </div>
        )}
      </div>

      <Section title="SETS">
        <SetBars sets={d.sets} run={run} instant={instant} />
        <div className="text-sm font-bold text-gray-dark mt-2">
          {d.setsHit} of {d.sets.length} sets on target
        </div>
      </Section>

      {d.motion && (
        <Section title={`AVERAGE REP · ${d.motion.reps} REPS`}>
          <RepCurve m={d.motion} run={run} instant={instant} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Tile label="REP TIME" value={`${d.motion.repSec.toFixed(1)} s`} />
            <Tile label="RANGE OF MOTION" value={`${Math.round(d.motion.rom)}°`} />
          </div>
        </Section>
      )}

      <Section title="COMPARED TO LAST TIME">
        <div className="grid grid-cols-2 gap-2">
          <Tile
            label="VOLUME"
            value={fmt(row.today)}
            sub={
              row.firstTime ? <span className="text-coin">First time!</span>
              : pct !== null && pct > 0 ? <span className="text-good">▲ {pct}%</span>
              : pct === 0 ? <span className="text-ink">= Matched</span>
              : row.last != null ? <span className="text-gray-dark">Last {fmt(row.last)}</span>
              : null
            }
          />
          <Tile
            label="TOP SET"
            value={formatTop(d.top)}
            star={row.best !== null}
            sub={d.lastTop && <span className="text-gray-dark">Last {formatTop(d.lastTop)}</span>}
          />
        </div>
      </Section>

      <Section title="TREND">
        {d.trend.length > 1 ? (
          <Trend points={d.trend} unit={row.unit} run={run} instant={instant} />
        ) : (
          <div className="bg-panel-dark rounded-2xl p-4 text-sm font-bold text-gray-dark text-center">
            Your trend starts here. Every session adds a bar.
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">{title}</div>
      {children}
    </div>
  );
}
