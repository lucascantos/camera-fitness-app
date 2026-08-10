// Maps normalised MediaPipe landmarks into the overlay canvas and draws them.
//
// The canvas bitmap is sized to match its CSS box, not the video's native
// resolution. The <video> underneath uses object-fit:cover, so the same
// cover-crop transform has to be applied to the landmarks or the skeleton
// drifts off the athlete on any aspect ratio but an exact match.

import type { Landmark } from "./helpers";
import type { PoseRenderer, PoseStyle } from "./poseRenderer";

export function drawPoseOverlay(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  landmarks: Landmark[] | undefined,
  renderer: PoseRenderer,
  style: PoseStyle,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (!video || !landmarks) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }

  const vw = video.videoWidth || cw;
  const vh = video.videoHeight || ch;
  const s = Math.max(cw / vw, ch / vh);        // cover scale
  const ox = (cw - vw * s) / 2;                 // horizontal offset (negative = cropped)
  const oy = (ch - vh * s) / 2;                 // vertical offset

  const mapped = landmarks.map((lm) => ({
    ...lm,
    x: (lm.x * vw * s + ox) / cw,
    y: (lm.y * vh * s + oy) / ch,
  }));

  renderer.draw(ctx, mapped, cw, ch, style);
}
