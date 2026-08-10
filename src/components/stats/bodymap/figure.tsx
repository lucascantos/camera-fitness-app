// The anatomical silhouette, built from smooth bezier paths so the body reads
// as one continuous figure instead of a stack of detached primitives.
// Coordinates are tuned to match the normalised muscle-region rectangles
// declared in data/stats/bodyMap.ts.
//
// isBack subtly redraws a few details (no neck dent, glute hint) so the back
// view doesn't look identical to the front; the colour tint does most of the
// differentiation work.

import { heatLevel } from "@/data/stats/bodyMap";

// Figure SVG dimensions.
export const FW = 220;
export const FH = 460;

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

const STROKE = "#B6B2C4";
const STROKE_WIDTH = 1.2;

/**
 * Render the body. Each body part that maps to a muscle gets a fill derived
 * from that muscle's heat; non-muscle parts (head/neck/hands/feet) stay at the
 * neutral tint. Hovering a part highlights it and pings the parent.
 */
export function Figure({ tint, isBack, counts, maxReps, hovered, onHover }: {
  tint: string;
  isBack?: boolean;
  counts: Record<string, number>;
  maxReps: number;
  hovered: string | null;
  onHover(m: string | null): void;
}) {
  // Null muscle → neutral tint. A muscle with no recorded reps stays neutral
  // too so untrained areas read as plain body, not as "lit".
  function fillFor(muscle: string | null): string {
    if (!muscle) return tint;
    const heat = heatLevel(counts[muscle] ?? 0, maxReps);
    if (heat <= 0) return tint;
    return `rgba(216, 32, 44, ${0.18 + heat * 0.62})`;
  }

  function Part({ d, ellipse, muscle }: {
    d?: string;
    ellipse?: { cx: number; cy: number; rx: number; ry: number };
    muscle: string | null;
  }) {
    const interactive = !!muscle;
    const isHovered = !!muscle && hovered === muscle;
    const props = {
      fill: fillFor(muscle),
      stroke: isHovered ? "#FFFFFF" : STROKE,
      strokeWidth: isHovered ? 2.4 : STROKE_WIDTH,
      onMouseEnter: interactive ? () => onHover(muscle!) : undefined,
      onMouseLeave: interactive ? () => onHover(null) : undefined,
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
      <line
        x1={110} y1={104} x2={110} y2={isBack ? 228 : 160}
        stroke={STROKE} strokeWidth={0.6} opacity={isBack ? 0.45 : 0.4}
      />
    </g>
  );
}
