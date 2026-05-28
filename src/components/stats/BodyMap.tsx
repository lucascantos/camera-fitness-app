// Ported from: scenes/statistics.py (legacy FitnessApp repo, Body Map tab)
// Two figures (front + back) with muscle-region ellipses heat-tinted by
// rep volume. Hover a muscle to highlight it in the sidebar rank list.

import { useMemo, useState } from "react";
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  heatLevel,
  muscleRanking,
  muscleRepCounts,
  neglectedMuscles,
  type Region,
} from "@/data/stats/bodyMap";

// Figure SVG dimensions (matches the normalised bbox the legacy code used).
const FW = 220;
const FH = 460;

export function BodyMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = useMemo(() => muscleRepCounts(), []);
  const ranking = useMemo(() => muscleRanking(counts), [counts]);
  const neglect = useMemo(() => neglectedMuscles(counts, 5), [counts]);
  const maxReps = ranking[0]?.reps ?? 0;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 px-8 pb-8">
      {/* ── Figures ─────────────────────────────────────────────── */}
      <section className="bg-panel rounded-3xl border border-border shadow-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              BODY MAP
            </div>
            <h2 className="text-2xl font-extrabold text-ink mt-1">
              Coverage across all training
            </h2>
          </div>
          <div className="text-xs text-gray-dark">
            Hover a muscle to inspect
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-4">
          <FigurePanel
            title="FRONT"
            tint="#FFE9E9"
            regions={FRONT_MUSCLES}
            counts={counts}
            maxReps={maxReps}
            hovered={hovered}
            onHover={setHovered}
            front
          />
          <FigurePanel
            title="BACK"
            tint="#EDECF2"
            regions={BACK_MUSCLES}
            counts={counts}
            maxReps={maxReps}
            hovered={hovered}
            onHover={setHovered}
          />
        </div>
      </section>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-5">
        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
            RANKING
          </div>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            {ranking.map((r) => (
              <RankRow
                key={r.muscle}
                muscle={r.muscle}
                reps={r.reps}
                max={maxReps}
                highlighted={hovered === r.muscle}
                onHover={setHovered}
              />
            ))}
          </div>
        </div>

        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="text-[11px] font-bold tracking-widest text-accent mb-3">
            NEEDS ATTENTION
          </div>
          {neglect.map((n) => (
            <div
              key={n.muscle}
              onMouseEnter={() => setHovered(n.muscle)}
              onMouseLeave={() => setHovered(null)}
              className={
                "flex items-center justify-between py-1.5 rounded-lg px-2 cursor-default transition " +
                (hovered === n.muscle ? "bg-panel-dark" : "")
              }
            >
              <span className="text-ink font-bold">{n.muscle}</span>
              <span className="text-xs text-gray-dark">
                {n.reps === 0 ? "no reps yet" : `${n.reps} reps`}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────

function FigurePanel({
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
          {/* tinted figure background */}
          <Figure tint={tint} />
          {/* muscle overlay ellipses */}
          {Object.entries(regions).map(([muscle, rects]) =>
            rects.map((r, i) => {
              const reps = counts[muscle] ?? 0;
              const heat = heatLevel(reps, maxReps);
              const isHovered = hovered === muscle;
              return (
                <RegionEllipse
                  key={`${muscle}-${i}`}
                  region={r}
                  heat={heat}
                  hovered={isHovered}
                  onEnter={() => onHover(muscle)}
                  onLeave={() => onHover(null)}
                />
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * Stick-figure silhouette drawn with primitives so it renders crisp at
 * any size. Not anatomically perfect — it's a target shape for the
 * muscle ellipses to land on, same role as in the legacy app.
 */
function Figure({ tint }: { tint: string }) {
  return (
    <g>
      {/* Head */}
      <circle cx={FW / 2} cy={36} r={26} fill={tint} stroke="#C5C2D2" />
      {/* Neck */}
      <rect x={FW / 2 - 10} y={58} width={20} height={14} fill={tint} stroke="#C5C2D2" />
      {/* Torso (trapezoid) */}
      <polygon
        points={`${FW * 0.22},72 ${FW * 0.78},72 ${FW * 0.74},230 ${FW * 0.26},230`}
        fill={tint} stroke="#C5C2D2"
      />
      {/* Arms (upper) */}
      <polygon
        points={`${FW * 0.22},72 ${FW * 0.07},90 ${FW * 0.07},170 ${FW * 0.22},170`}
        fill={tint} stroke="#C5C2D2"
      />
      <polygon
        points={`${FW * 0.78},72 ${FW * 0.93},90 ${FW * 0.93},170 ${FW * 0.78},170`}
        fill={tint} stroke="#C5C2D2"
      />
      {/* Forearms */}
      <rect x={FW * 0.07} y={170} width={FW * 0.15} height={68} fill={tint} stroke="#C5C2D2" />
      <rect x={FW * 0.78} y={170} width={FW * 0.15} height={68} fill={tint} stroke="#C5C2D2" />
      {/* Hips */}
      <polygon
        points={`${FW * 0.26},230 ${FW * 0.74},230 ${FW * 0.72},262 ${FW * 0.28},262`}
        fill={tint} stroke="#C5C2D2"
      />
      {/* Thighs */}
      <polygon
        points={`${FW * 0.28},262 ${FW * 0.48},262 ${FW * 0.46},356 ${FW * 0.30},356`}
        fill={tint} stroke="#C5C2D2"
      />
      <polygon
        points={`${FW * 0.52},262 ${FW * 0.72},262 ${FW * 0.70},356 ${FW * 0.54},356`}
        fill={tint} stroke="#C5C2D2"
      />
      {/* Calves */}
      <rect x={FW * 0.30} y={356} width={FW * 0.16} height={92} fill={tint} stroke="#C5C2D2" />
      <rect x={FW * 0.54} y={356} width={FW * 0.16} height={92} fill={tint} stroke="#C5C2D2" />
    </g>
  );
}

function RegionEllipse({
  region, heat, hovered, onEnter, onLeave,
}: {
  region: Region;
  heat: number;       // 0..1
  hovered: boolean;
  onEnter(): void;
  onLeave(): void;
}) {
  const [nx, ny, nw, nh] = region;
  // Convert normalised coords to figure-svg coords. The legacy figure spans
  // roughly 0.0..1.0 across width and 0.0..0.98 across height; we mirror that.
  const x = nx * FW;
  const y = ny * (FH - 12) + 72; // 72 ≈ top of torso
  const w = nw * FW;
  const h = nh * (FH - 12);
  const cx = x + w / 2;
  const cy = y + h / 2;

  const fill = heat > 0
    ? `rgba(216, 32, 44, ${0.20 + heat * 0.55})`
    : "rgba(216, 32, 44, 0.08)";
  const stroke = hovered ? "#FFFFFF" : "rgba(216, 32, 44, 0.55)";
  const strokeW = hovered ? 2.5 : 1;

  return (
    <ellipse
      cx={cx} cy={cy} rx={w / 2} ry={h / 2}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeW}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    />
  );
}

function RankRow({
  muscle, reps, max, highlighted, onHover,
}: {
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
