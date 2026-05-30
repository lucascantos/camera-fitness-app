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

// Figure SVG dimensions. The body itself spans BODY_TOP..BODY_TOP+BODY_SPAN
// vertically; muscle regions (0..1 normalised) map into that range so they
// can't overflow past the calves.
const FW        = 220;
const FH        = 480;
const BODY_TOP  = 80;   // top of shoulders / torso
const BODY_SPAN = 370;  // shoulders → ankle

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
              MUSCLE FREQUENCY
            </div>
            <h2 className="text-2xl font-extrabold text-ink mt-1">
              Hover or tap a muscle to inspect
            </h2>
          </div>
          <HeatLegend />
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
          <Figure tint={tint} isBack={!front} />
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
 * Anatomical silhouette built from smooth bezier paths so the body reads
 * as one continuous figure instead of a stack of detached primitives.
 * Coordinates are tuned to match the normalised muscle-region rectangles
 * declared in data/stats/bodyMap.ts.
 *
 * isBack subtly redraws a few details (no neck dent, glute hint) so the
 * back view doesn't look identical to the front; the colour tint does
 * most of the differentiation work.
 */
function Figure({ tint, isBack }: { tint: string; isBack?: boolean }) {
  const stroke = "#B6B2C4";
  const sw     = 1.2;

  return (
    <g
      fill={tint}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* HEAD — egg-shaped, slightly tapered at the chin */}
      <path d="
        M 110 12
        C 90 12 82 28 82 44
        C 82 62 92 72 110 72
        C 128 72 138 62 138 44
        C 138 28 130 12 110 12 Z
      " />

      {/* NECK — short trapezoid widening into the shoulders */}
      <path
        d={
          isBack
            ? "M 100 70 L 120 70 L 124 84 L 96 84 Z"
            : "M 100 70 L 120 70 L 124 84 L 96 84 Z"
        }
      />

      {/* TORSO — shoulders (50→170) → waist (78→142) → hips (66→154) */}
      <path d="
        M 96 80
        C 70 84 50 92 48 100
        C 44 124 46 156 50 184
        C 54 212 64 244 72 270
        L 76 292
        L 144 292
        L 148 270
        C 156 244 166 212 170 184
        C 174 156 176 124 172 100
        C 170 92 150 84 124 80
        Z
      " />

      {/* LEFT UPPER ARM — shoulder → elbow, slight bicep bulge */}
      <path d="
        M 50 96
        C 38 104 32 124 30 156
        C 28 178 30 194 36 198
        C 44 198 50 188 52 174
        L 56 138
        C 58 116 56 102 50 96 Z
      " />
      {/* RIGHT UPPER ARM (mirror) */}
      <path d="
        M 170 96
        C 182 104 188 124 190 156
        C 192 178 190 194 184 198
        C 176 198 170 188 168 174
        L 164 138
        C 162 116 164 102 170 96 Z
      " />

      {/* LEFT FOREARM — elbow → wrist, tapers in */}
      <path d="
        M 32 196
        C 30 222 30 244 32 258
        C 34 266 40 270 46 266
        C 50 256 50 240 48 222
        L 46 200
        C 42 196 36 195 32 196 Z
      " />
      {/* RIGHT FOREARM (mirror) */}
      <path d="
        M 188 196
        C 190 222 190 244 188 258
        C 186 266 180 270 174 266
        C 170 256 170 240 172 222
        L 174 200
        C 178 196 184 195 188 196 Z
      " />

      {/* LEFT HAND */}
      <ellipse cx={40} cy={278} rx={9} ry={12} />
      {/* RIGHT HAND */}
      <ellipse cx={180} cy={278} rx={9} ry={12} />

      {/* LEFT THIGH — hip → knee, slight taper */}
      <path d="
        M 76 290
        C 72 312 70 340 72 372
        L 104 372
        C 106 340 108 312 108 290 Z
      " />
      {/* RIGHT THIGH (mirror) */}
      <path d="
        M 112 290
        C 112 312 114 340 116 372
        L 148 372
        C 150 340 148 312 144 290 Z
      " />

      {/* LEFT CALF — knee → ankle, narrow at ankle */}
      <path d="
        M 74 372
        C 72 396 74 424 80 446
        C 84 452 96 452 100 446
        C 104 424 104 396 102 372 Z
      " />
      {/* RIGHT CALF (mirror) */}
      <path d="
        M 118 372
        C 116 396 116 424 120 446
        C 124 452 136 452 140 446
        C 146 424 148 396 146 372 Z
      " />

      {/* FEET — small ovals at the bottom */}
      <ellipse cx={90}  cy={458} rx={14} ry={6} />
      <ellipse cx={130} cy={458} rx={14} ry={6} />

      {/* SUBTLE DETAIL — center line for front, spine line for back */}
      {!isBack && (
        <line x1={110} y1={90} x2={110} y2={170}
              stroke={stroke} strokeWidth={0.6} opacity={0.4} />
      )}
      {isBack && (
        <line x1={110} y1={90} x2={110} y2={260}
              stroke={stroke} strokeWidth={0.6} opacity={0.45} />
      )}
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
  // Convert normalised coords to figure-svg coords. The body occupies
  // BODY_TOP .. BODY_TOP + BODY_SPAN vertically; muscle regions map into
  // that range so they land on the body, not beyond it.
  const x  = nx * FW;
  const y  = ny * BODY_SPAN + BODY_TOP;
  const w  = nw * FW;
  const h  = nh * BODY_SPAN;
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

function HeatLegend() {
  // 4-step ramp matching the alpha scale in RegionEllipse: 0.08 (no
  // training) → 0.75 (heavily trained).
  const stops = [0.08, 0.30, 0.55, 0.75];
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
