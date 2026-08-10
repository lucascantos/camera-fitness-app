// The per-style draw routines behind the pose overlay. Each takes points
// already smoothed (or not) by the renderer, in normalised 0..1 space.

import { POSE_CONNECTIONS } from "./drawPose";

export interface Pt {
  x: number;
  y: number;
  v: number;
}

const COLOR = "#00E07A";
// Aura: fraction of the previous frame erased each tick. Lower = longer trail.
const BLOB_FADE = 0.16;

export function drawSkeleton(
  ctx: CanvasRenderingContext2D, pts: (Pt | null)[], w: number, h: number,
) {
  ctx.strokeStyle = COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (const [a, b] of POSE_CONNECTIONS) {
    const p1 = pts[a];
    const p2 = pts[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = COLOR;
  for (const p of pts) {
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBlob(
  ctx: CanvasRenderingContext2D, pts: (Pt | null)[], w: number, h: number,
) {
  // 1. Decay last frame instead of clearing — what remains is the trail.
  //    destination-out erases `BLOB_FADE` of the existing alpha toward
  //    transparent (not toward black), which keeps the overlay see-through.
  ctx.save();
  ctx.filter = "none";
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = `rgba(0,0,0,${BLOB_FADE})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 2. Soft blurred aura at the current (raw, un-smoothed) position. Drawn over
  //    the surviving trail so the glow appears to emanate and stream behind.
  ctx.save();
  ctx.filter = `blur(${Math.max(6, w * 0.012)}px)`;
  ctx.strokeStyle = "rgba(0,224,122,0.5)";
  ctx.fillStyle = "rgba(0,224,122,0.5)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const limbW = h * 0.05;
  ctx.lineWidth = limbW;
  for (const [a, b] of POSE_CONNECTIONS) {
    const p1 = pts[a];
    const p2 = pts[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }
  fillIndexedPoly(ctx, pts, [11, 12, 24, 23], w, h);
  for (const p of pts) {
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, limbW * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function fillIndexedPoly(
  ctx: CanvasRenderingContext2D,
  pts: (Pt | null)[],
  idx: number[],
  w: number,
  h: number,
) {
  const ps = idx.map((i) => pts[i]);
  if (ps.some((p) => !p)) return;
  ctx.beginPath();
  ps.forEach((p, i) =>
    i ? ctx.lineTo(p!.x * w, p!.y * h) : ctx.moveTo(p!.x * w, p!.y * h),
  );
  ctx.closePath();
  ctx.fill();
}
