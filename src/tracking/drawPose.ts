// Skeleton overlay — draws MediaPipe pose landmarks + connections onto
// a 2D canvas. Matches the look from the legacy app: bright green dots,
// thin connecting lines, low-visibility points hidden.

import type { Landmark } from "./helpers";

// Standard MediaPipe Pose connections (33 landmarks).
// Each pair is [from, to] indices.
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Face cluster
  [0, 1],  [1, 2],  [2, 3],  [3, 7],
  [0, 4],  [4, 5],  [5, 6],  [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Right arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Left arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Right leg
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  // Left leg
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

const DOT_COLOR  = "#00E07A";
const LINE_COLOR = "#00E07A";
const MIN_VISIBILITY = 0.5;

export interface DrawPoseOptions {
  dotRadius?: number;
  lineWidth?: number;
  minVisibility?: number;
}

/** Draws landmarks (normalised 0..1) onto the canvas in pixel space. */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  opts: DrawPoseOptions = {},
) {
  const dotR  = opts.dotRadius ?? 4;
  const lineW = opts.lineWidth ?? 2.5;
  const minV  = opts.minVisibility ?? MIN_VISIBILITY;

  ctx.clearRect(0, 0, width, height);

  // Connections
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth   = lineW;
  ctx.lineCap     = "round";
  for (const [a, b] of POSE_CONNECTIONS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    if ((p1.visibility ?? 1) < minV || (p2.visibility ?? 1) < minV) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  // Dots
  ctx.fillStyle = DOT_COLOR;
  for (const lm of landmarks) {
    if (!lm) continue;
    if ((lm.visibility ?? 1) < minV) continue;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}
