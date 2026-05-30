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

// Figure SVG dimensions. Muscle regions (0..1 normalised) map into
// BODY_TOP..BODY_TOP+BODY_SPAN vertically so they always land inside
// the silhouette.
const FW        = 220;
const FH        = 500;
const BODY_TOP  = 92;   // top of shoulders / torso
const BODY_SPAN = 380;  // shoulders → ankle

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
      {/* HEAD — egg-shaped */}
      <path d="
        M 110 18
        C 90 18 82 34 82 50
        C 82 68 92 80 110 80
        C 128 80 138 68 138 50
        C 138 34 130 18 110 18 Z
      " />

      {/* NECK */}
      <path d="M 100 78 L 120 78 L 124 94 L 96 94 Z" />

      {/* TORSO — shoulders (62→158, w=96) → waist (78→142, w=64) →
          hips (66→154, w=88). Waist/shoulder ratio ≈ 0.67 for an athletic
          but proportional male torso. Smooth bezier all the way. */}
      <path d="
        M 96 92
        L 62 100
        C 52 124 54 168 64 200
        C 70 224 76 248 78 270
        C 80 286 74 296 66 304
        L 154 304
        C 146 296 140 286 142 270
        C 144 248 150 224 156 200
        C 166 168 168 124 158 100
        L 124 92 Z
      " />

      {/* LEFT UPPER ARM — shoulder → elbow */}
      <path d="
        M 62 102
        C 46 112 38 138 36 168
        C 36 192 44 204 52 200
        C 56 186 60 168 62 144
        C 64 124 64 110 62 102 Z
      " />
      {/* RIGHT UPPER ARM */}
      <path d="
        M 158 102
        C 174 112 182 138 184 168
        C 184 192 176 204 168 200
        C 164 186 160 168 158 144
        C 156 124 156 110 158 102 Z
      " />

      {/* LEFT FOREARM */}
      <path d="
        M 36 202
        C 34 226 36 250 42 268
        C 46 274 54 274 56 266
        C 58 246 56 224 52 204
        C 48 200 40 200 36 202 Z
      " />
      {/* RIGHT FOREARM */}
      <path d="
        M 184 202
        C 186 226 184 250 178 268
        C 174 274 166 274 164 266
        C 162 246 164 224 168 204
        C 172 200 180 200 184 202 Z
      " />

      {/* HANDS */}
      <ellipse cx={48} cy={278} rx={10} ry={11} />
      <ellipse cx={172} cy={278} rx={10} ry={11} />

      {/* LEFT DELTOID / SHOULDER CAP — rendered after the arm so the
          bicep curve tucks under. Outer edge extends past the arm so
          the silhouette gets the widest point at the shoulder, not
          the bicep. */}
      <path d="
        M 96 92
        C 72 82 50 84 36 102
        C 28 118 28 134 36 146
        C 48 146 62 138 72 124
        C 80 112 88 100 96 92 Z
      " />
      {/* RIGHT DELTOID / SHOULDER CAP (mirror) */}
      <path d="
        M 124 92
        C 148 82 170 84 184 102
        C 192 118 192 134 184 146
        C 172 146 158 138 148 124
        C 140 112 132 100 124 92 Z
      " />

      {/* LEFT THIGH — hip → knee */}
      <path d="
        M 68 304
        C 64 338 64 376 72 410
        L 104 410
        C 108 376 110 338 108 304 Z
      " />
      {/* RIGHT THIGH */}
      <path d="
        M 112 304
        C 110 338 112 376 116 410
        L 148 410
        C 156 376 156 338 152 304 Z
      " />

      {/* LEFT CALF — taper to ankle */}
      <path d="
        M 74 410
        C 70 432 72 456 78 474
        C 82 480 92 480 96 474
        C 102 456 100 432 98 410 Z
      " />
      {/* RIGHT CALF */}
      <path d="
        M 122 410
        C 120 432 120 456 124 474
        C 128 480 138 480 142 474
        C 148 456 146 432 146 410 Z
      " />

      {/* FEET */}
      <ellipse cx={86} cy={486} rx={14} ry={6} />
      <ellipse cx={134} cy={486} rx={14} ry={6} />

      {/* SUBTLE DETAIL — front: chest centre line. back: spine. */}
      {!isBack && (
        <line x1={110} y1={104} x2={110} y2={170}
              stroke={stroke} strokeWidth={0.6} opacity={0.4} />
      )}
      {isBack && (
        <line x1={110} y1={104} x2={110} y2={260}
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
