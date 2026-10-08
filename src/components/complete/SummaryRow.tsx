// One exercise in the Session Summary. The bar is today's volume; a faint
// ghost behind it marks last time, so a better session is something you watch
// happen — the fill climbs past the ghost. Records pop in afterwards.

import { useEffect, useState } from "react";
import { titleCase } from "@/lib/format";
import { changePct, type SummaryRow as Row } from "./summary";
import { useCountUp } from "./useTimeline";

const fmt = (n: number) => Math.round(n).toLocaleString();

export function SummaryRow({ row, highlight, instant, onOpen }: {
  row: Row;
  /** Opens this exercise's detail card (once the reveal has finished). */
  onOpen?: () => void;
  /** Records stage reached — show the badge. */
  highlight: boolean;
  /** Skipped: render final state with no motion. */
  instant: boolean;
}) {
  // Mount at zero, then grow on the next frame so the transition runs.
  const [grown, setGrown] = useState(instant);
  useEffect(() => {
    if (instant) { setGrown(true); return; }
    const id = setTimeout(() => setGrown(true), 30);
    return () => clearTimeout(id);
  }, [instant]);

  const value = useCountUp(row.today, grown, instant);
  const pct = changePct(row);
  const improved = pct !== null && pct > 0;

  // Headroom so a beaten ghost still visibly sits short of the end.
  const scale = Math.max(row.today, row.last ?? 0) * 1.08 || 1;
  const fill = row.today / scale;
  const ghost = row.last != null ? row.last / scale : 0;

  return (
    <div
      onClick={onOpen}
      className={
        "relative bg-panel-dark rounded-2xl p-4 " +
        (onOpen ? "cursor-pointer active:scale-[0.98] transition-transform " : "") +
        (instant ? "" : "animate-row-in")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-extrabold text-ink text-lg truncate">{titleCase(row.exercise)}</div>
        <div className="font-black text-ink text-xl tabular-nums shrink-0">
          {fmt(value)}
          <span className="text-sm font-bold text-gray-dark"> {row.unit}</span>
        </div>
      </div>

      <div className="relative mt-2 h-4 bg-panel rounded-full overflow-hidden">
        {ghost > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-ink/15 border-r-2 border-ink/40"
            style={{ width: `${ghost * 100}%` }}
          />
        )}
        <div
          className={
            "absolute inset-0 origin-left rounded-full will-change-transform " +
            (improved ? "bg-good " : "bg-accent ") +
            (instant ? "" : "transition-transform duration-1000 ease-out")
          }
          style={{ transform: `scaleX(${grown ? fill : 0})` }}
        />
      </div>

      <div className="mt-2 text-sm font-bold h-5">
        {row.firstTime ? (
          <span className="text-coin">First time!</span>
        ) : improved ? (
          <span className="text-good">▲ {pct}% vs last time</span>
        ) : pct === 0 ? (
          <span className="text-ink">= Matched last time</span>
        ) : row.last != null ? (
          <span className="text-gray-dark font-semibold">Last time {fmt(row.last)} {row.unit}</span>
        ) : null}
      </div>

      {highlight && row.best && (
        <div
          className={
            "absolute -top-2.5 right-3 bg-coin text-white text-xs font-extrabold tracking-wide " +
            "rounded-full px-2.5 py-1 shadow-card " + (instant ? "" : "animate-pop")
          }
        >
          {row.best === "weight" ? "★ NEW BEST" : "★ REP BEST"}
        </div>
      )}
    </div>
  );
}
