// Pose overlay renderer with several display styles + temporal smoothing.
//
// The raw MediaPipe landmarks jitter frame-to-frame. This renderer keeps
// per-landmark state so it can spring-smooth the positions before drawing.
// The styles themselves live in ./poseStyles:
//
//   spring – skeleton, spring-damped:  v += (target - d) * k; v *= damp; d += v
//   blob   – soft blurred aura following the body, with a motion trail.

import type { Landmark } from "./helpers";
import { drawBlob, drawSkeleton, type Pt } from "./poseStyles";

export type PoseStyle = "spring" | "blob" | "off";

export const POSE_STYLES: { id: PoseStyle; label: string; hint: string }[] = [
  { id: "spring", label: "Lines", hint: "Smoothed body lines" },
  { id: "blob",   label: "Aura",  hint: "Soft glow with a motion trail" },
  { id: "off",    label: "Off",   hint: "Hide the overlay" },
];

const MIN_VISIBILITY = 0.5;

// Which smoothing each style uses.
const SMOOTHING: Record<PoseStyle, "none" | "spring"> = {
  spring: "spring",
  blob: "none", // leading edge tracks raw; the trail comes from canvas fade
  off: "none",
};

// Spring constants.
const STIFFNESS = 0.30;
const DAMPING = 0.55;

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
    // Off: clear and draw nothing.
    if (style === "off") {
      ctx.clearRect(0, 0, w, h);
      return;
    }
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
