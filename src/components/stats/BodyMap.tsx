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
const FH        = 460;
const BODY_TOP  = 92;   // top of shoulders / torso
const BODY_SPAN = 338;  // shoulders → ankle (shorter torso, longer legs)

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
// Body part path data. Stored as constants so the front and back views
// share geometry; only the muscle assignment per part differs.
const HEAD_PATH    = "M 110 18 C 90 18 82 34 82 50 C 82 68 92 80 110 80 C 128 80 138 68 138 50 C 138 34 130 18 110 18 Z";
const NECK_PATH    = "M 100 78 L 120 78 L 124 94 L 96 94 Z";

// Torso split into 3 horizontal bands so each can carry its own muscle:
// chest area, abs area, hip area. The combined boundaries match the
// original single-piece torso outline.
const CHEST_PATH   = "M 96 92 L 62 100 C 50 122 50 145 56 158 L 164 158 C 170 145 170 122 158 100 L 124 92 Z";
const ABS_PATH     = "M 56 158 L 164 158 C 168 175 160 200 144 210 L 76 210 C 60 200 52 175 56 158 Z";
const HIP_PATH     = "M 76 210 L 144 210 C 148 222 156 230 152 230 L 68 230 C 64 230 72 222 76 210 Z";

const LEFT_UPPER_ARM_PATH  = "M 62 102 C 46 112 38 138 36 168 C 36 192 44 204 52 200 C 56 186 60 168 62 144 C 64 124 64 110 62 102 Z";
const RIGHT_UPPER_ARM_PATH = "M 158 102 C 174 112 182 138 184 168 C 184 192 176 204 168 200 C 164 186 160 168 158 144 C 156 124 156 110 158 102 Z";

const LEFT_FOREARM_PATH    = "M 36 202 C 34 226 36 250 42 268 C 46 274 54 274 56 266 C 58 246 56 224 52 204 C 48 200 40 200 36 202 Z";
const RIGHT_FOREARM_PATH   = "M 184 202 C 186 226 184 250 178 268 C 174 274 166 274 164 266 C 162 246 164 224 168 204 C 172 200 180 200 184 202 Z";

const LEFT_DELTOID_PATH    = "M 96 92 C 76 84 58 86 46 100 C 38 114 36 128 44 138 C 56 136 68 128 74 116 C 82 106 88 98 96 92 Z";
const RIGHT_DELTOID_PATH   = "M 124 92 C 144 84 162 86 174 100 C 182 114 184 128 176 138 C 164 136 152 128 146 116 C 138 106 132 98 124 92 Z";

const LEFT_THIGH_PATH      = "M 70 230 C 66 264 66 304 74 345 L 102 345 C 108 304 110 264 108 230 Z";
const RIGHT_THIGH_PATH     = "M 112 230 C 110 264 112 304 118 345 L 146 345 C 154 304 154 264 150 230 Z";

const LEFT_CALF_PATH       = "M 76 345 C 72 372 74 402 80 422 C 84 430 92 430 96 422 C 102 402 100 372 100 345 Z";
const RIGHT_CALF_PATH      = "M 120 345 C 118 372 118 402 124 422 C 128 430 136 430 140 422 C 146 402 148 372 144 345 Z";

/** Render the body. Each body part that maps to a muscle gets a fill
 *  derived from that muscle's heat; non-muscle parts (head/neck/hands/
 *  feet) stay at the neutral tint. Hovering a part highlights it and
 *  pings the parent through onHover. */
function Figure({
  tint, isBack, counts, maxReps, hovered, onHover,
}: {
  tint: string;
  isBack?: boolean;
  counts: Record<string, number>;
  maxReps: number;
  hovered: string | null;
  onHover(m: string | null): void;
}) {
  const stroke = "#B6B2C4";
  const sw     = 1.2;

  // Compute fill for a body part. Null muscle → neutral tint. A muscle
  // with no recorded reps stays neutral too so untrained areas read as
  // plain body, not as "lit".
  function fillFor(muscle: string | null): string {
    if (!muscle) return tint;
    const reps = counts[muscle] ?? 0;
    const heat = heatLevel(reps, maxReps);
    if (heat <= 0) return tint;
    return `rgba(216, 32, 44, ${0.18 + heat * 0.62})`;
  }

  function Part({ d, ellipse, muscle }: {
    d?: string;
    ellipse?: { cx: number; cy: number; rx: number; ry: number };
    muscle: string | null;
  }) {
    const interactive = !!muscle;
    const isHovered   = !!muscle && hovered === muscle;
    const props = {
      fill: fillFor(muscle),
      stroke: isHovered ? "#FFFFFF" : stroke,
      strokeWidth: isHovered ? 2.4 : sw,
      onMouseEnter: interactive ? () => onHover(muscle!) : undefined,
      onMouseLeave: interactive ? () => onHover(null)   : undefined,
      style: interactive ? { cursor: "pointer" as const } : undefined,
    };
    if (ellipse) return <ellipse {...ellipse} {...props} />;
    return <path d={d!} {...props} />;
  }

  // Muscle assignments per view.
  const torsoTop = isBack ? "Traps"  : "Chest";
  const torsoMid = isBack ? "Lats"   : "Abs";
  const torsoBot = isBack ? "Glutes" : null;     // hips have no muscle on the front
  const delts    = isBack ? "Rear Delts" : "Front Delts";
  const upperArm = isBack ? "Triceps" : "Biceps";
  const thigh    = isBack ? "Hamstrings" : "Quads";

  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* Non-muscle parts */}
      <Part d={HEAD_PATH} muscle={null} />
      <Part d={NECK_PATH} muscle={null} />

      {/* Torso bands */}
      <Part d={CHEST_PATH} muscle={torsoTop} />
      <Part d={ABS_PATH}   muscle={torsoMid} />
      <Part d={HIP_PATH}   muscle={torsoBot} />

      {/* Arms */}
      <Part d={LEFT_UPPER_ARM_PATH}  muscle={upperArm} />
      <Part d={RIGHT_UPPER_ARM_PATH} muscle={upperArm} />
      <Part d={LEFT_FOREARM_PATH}    muscle="Forearms" />
      <Part d={RIGHT_FOREARM_PATH}   muscle="Forearms" />

      {/* Hands — neutral */}
      <Part ellipse={{ cx: 48,  cy: 278, rx: 10, ry: 11 }} muscle={null} />
      <Part ellipse={{ cx: 172, cy: 278, rx: 10, ry: 11 }} muscle={null} />

      {/* Deltoid caps — rendered after arms so the bicep tucks under */}
      <Part d={LEFT_DELTOID_PATH}  muscle={delts} />
      <Part d={RIGHT_DELTOID_PATH} muscle={delts} />

      {/* Legs */}
      <Part d={LEFT_THIGH_PATH}  muscle={thigh} />
      <Part d={RIGHT_THIGH_PATH} muscle={thigh} />
      <Part d={LEFT_CALF_PATH}   muscle="Calves" />
      <Part d={RIGHT_CALF_PATH}  muscle="Calves" />

      {/* Feet — neutral */}
      <Part ellipse={{ cx: 88,  cy: 436, rx: 14, ry: 6 }} muscle={null} />
      <Part ellipse={{ cx: 132, cy: 436, rx: 14, ry: 6 }} muscle={null} />

      {/* SUBTLE DETAIL — front: chest centre line. back: spine. */}
      {!isBack && (
        <line x1={110} y1={104} x2={110} y2={160}
              stroke={stroke} strokeWidth={0.6} opacity={0.4} />
      )}
      {isBack && (
        <line x1={110} y1={104} x2={110} y2={228}
              stroke={stroke} strokeWidth={0.6} opacity={0.45} />
      )}
    </g>
  );
}

function HeatLegend() {
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
