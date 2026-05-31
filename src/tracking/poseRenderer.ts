// Pose overlay renderer with several display styles + temporal smoothing.
//
// The raw MediaPipe landmarks jitter frame-to-frame. This renderer keeps
// per-landmark state so it can low-pass ("lerp") or spring-smooth the
// positions before drawing, and offers softer visual styles (aura / polygons)
// that read better than the bare stick figure.
//
// Styles:
//   skeleton  – crisp lines + dots, no smoothing (the original look).
//   lerp      – skeleton, exponentially smoothed:  d += (target - d) * alpha
//   spring    – skeleton, spring-damped:           v += (target - d) * k; v *= damp; d += v
//   blob      – soft blurred aura following the body.
//   polygons  – faceted body panels (torso quad + tapered limb quads).

import type { Landmark } from "./helpers";
import { POSE_CONNECTIONS } from "./drawPose";

export type PoseStyle = "skeleton" | "spring" | "blob";

export const POSE_STYLES: { id: PoseStyle; label: string; hint: string }[] = [
  { id: "skeleton", label: "Stick figure", hint: "Crisp lines + dots" },
  { id: "spring",   label: "Spring",       hint: "Springy, smoothed follow" },
  { id: "blob",     label: "Aura",         hint: "Soft glow with a motion trail" },
];

const COLOR = "#00E07A";
const MIN_VISIBILITY = 0.5;

// Which smoothing each style uses.
const SMOOTHING: Record<PoseStyle, "none" | "spring"> = {
  skeleton: "none",
  spring: "spring",
  blob: "none", // leading edge tracks raw; the trail comes from canvas fade
};

// Aura: fraction of the previous frame erased each tick. Lower = longer trail.
const BLOB_FADE = 0.16;

// Spring constants.
const STIFFNESS = 0.30;
const DAMPING = 0.55;

interface Pt {
  x: number;
  y: number;
  v: number;
}

export interface PoseRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    width: number,
    height: number,
    style: PoseStyle,
  ): void;
  reset(): void;
}

export function createPoseRenderer(): PoseRenderer {
  // Persistent per-landmark display state for smoothing.
  const disp = new Map<number, Pt>();
  const vel = new Map<number, { vx: number; vy: number }>();
  let prevSeen = new Set<number>();

  // Produce a smoothed (or raw) point array in normalised 0..1 space.
  // Entries below the visibility threshold become null (hidden).
  function smooth(landmarks: Landmark[], style: PoseStyle): (Pt | null)[] {
    const mode = SMOOTHING[style] ?? "none"; // tolerate stale persisted styles
    const out: (Pt | null)[] = new Array(landmarks.length).fill(null);
    const seen = new Set<number>();

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const v = lm?.visibility ?? 1;
      if (!lm || v < MIN_VISIBILITY) continue;
      seen.add(i);

      if (mode === "none") {
        out[i] = { x: lm.x, y: lm.y, v };
        continue;
      }

      // Snap to target if this landmark wasn't visible last frame — avoids a
      // long swoop when a joint reappears.
      let d = disp.get(i);
      if (!d || !prevSeen.has(i)) {
        d = { x: lm.x, y: lm.y, v };
        disp.set(i, d);
        vel.set(i, { vx: 0, vy: 0 });
      }

      // Spring-damped follow: v += (target - d) * k; v *= damp; d += v
      const vv = vel.get(i)!;
      vv.vx = (vv.vx + (lm.x - d.x) * STIFFNESS) * DAMPING;
      vv.vy = (vv.vy + (lm.y - d.y) * STIFFNESS) * DAMPING;
      d.x += vv.vx;
      d.y += vv.vy;
      d.v = v;
      out[i] = { x: d.x, y: d.y, v };
    }

    prevSeen = seen;
    return out;
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    w: number,
    h: number,
    style: PoseStyle,
  ) {
    const pts = smooth(landmarks, style);
    // Aura manages its own clearing (a partial fade) to leave a trail; every
    // other style starts from a clean canvas each frame.
    if (style === "blob") {
      drawBlob(ctx, pts, w, h);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    drawSkeleton(ctx, pts, w, h);
  }

  function reset() {
    disp.clear();
    vel.clear();
    prevSeen = new Set();
  }

  return { draw, reset };
}

// ── Style renderers ───────────────────────────────────────────────────────

function drawSkeleton(ctx: CanvasRenderingContext2D, pts: (Pt | null)[], w: number, h: number) {
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

function drawBlob(ctx: CanvasRenderingContext2D, pts: (Pt | null)[], w: number, h: number) {
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
  fillIndexedPoly(ctx, pts, [11, 12, 24, 23], w, h, false);
  for (const p of pts) {
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, limbW * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Geometry helpers ──────────────────────────────────────────────────────

function fillIndexedPoly(
  ctx: CanvasRenderingContext2D,
  pts: (Pt | null)[],
  idx: number[],
  w: number,
  h: number,
  stroke: boolean,
) {
  const ps = idx.map((i) => pts[i]);
  if (ps.some((p) => !p)) return;
  ctx.beginPath();
  ps.forEach((p, i) =>
    i ? ctx.lineTo(p!.x * w, p!.y * h) : ctx.moveTo(p!.x * w, p!.y * h),
  );
  ctx.closePath();
  ctx.fill();
  if (stroke) ctx.stroke();
}
