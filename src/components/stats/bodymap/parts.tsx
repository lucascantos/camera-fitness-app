// Framing around the two figures: the panel each sits in, the heat legend,
// and the sidebar ranking rows.

import type { Region } from "@/data/stats/bodyMap";
import { Figure, FH, FW } from "./figure";

export function FigurePanel({
  title, tint, regions, counts, maxReps, hovered, onHover, front,
}: {
  title: string;
  tint: string;
  regions: Record<string, Region[]>;
  counts: Record<string, number>;
  maxReps: number;
  hovered: string | null;
  onHover(m: string | null): void;
  front?: boolean;
}) {
  return (
    <div className="bg-bg rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className={"text-xs font-bold tracking-widest " + (front ? "text-accent" : "text-gray-dark")}
        >
          {title}
        </span>
        <span className="text-[10px] text-gray-dark">
          {Object.keys(regions).length} muscle groups
        </span>
      </div>
      <div className="grid place-items-center">
        <svg viewBox={`0 0 ${FW} ${FH}`} width="100%" style={{ maxWidth: 260 }}>
          <Figure
            tint={tint}
            isBack={!front}
            counts={counts}
            maxReps={maxReps}
            hovered={hovered}
            onHover={onHover}
          />
        </svg>
      </div>
    </div>
  );
}

export function HeatLegend() {
  // 4-step ramp matching the alpha scale used by Figure.fillFor():
  // 0.18 (lowest trained) → 0.80 (heavily trained).
  const stops = [0.18, 0.36, 0.58, 0.80];
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-dark">
      <span>Less</span>
      <div className="flex gap-1">
        {stops.map((a, i) => (
          <span
            key={i}
            className="w-4 h-4 rounded-sm border border-border"
            style={{ background: `rgba(216,32,44,${a})` }}
          />
        ))}
      </div>
      <span>More</span>
    </div>
  );
}

export function RankRow({ muscle, reps, max, highlighted, onHover }: {
  muscle: string;
  reps: number;
  max: number;
  highlighted: boolean;
  onHover(m: string | null): void;
}) {
  const pct = max > 0 ? Math.round((reps / max) * 100) : 0;
  return (
    <div
      onMouseEnter={() => onHover(muscle)}
      onMouseLeave={() => onHover(null)}
      className={
        "py-2 px-2 rounded-lg cursor-default transition " +
        (highlighted ? "bg-panel-dark" : "")
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-ink">{muscle}</span>
        <span className="text-xs text-gray-dark">{reps} reps</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full mt-1.5 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
