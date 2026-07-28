// Cheap image-quality sampling from the camera frame.
//
// Bad landmarks often come from a bad picture rather than a bad threshold: a
// dim room, a window behind the user (blown highlights, subject in silhouette),
// or a camera that's still auto-exposing. Nothing in the app can currently tell
// those apart from a tracker bug. Luminance, contrast and clipping cost one
// tiny drawImage plus a getImageData over a 64x36 buffer — small enough to run
// every frame while logging, and the same numbers can later drive a "it's too
// dark" coach hint.
//
// Motion energy (mean absolute luminance change vs the previous sample) is a
// bonus: it says whether the user was actually moving, which separates "the
// tracker missed the rep" from "the user paused".

import type { ImageStats } from "./types";

// Deliberately tiny. We want scene-level statistics, not detail; at this size
// the whole sample is 2304 pixels and getImageData stays sub-millisecond.
const W = 64;
const H = 36;
const CLIP_LOW = 0.04;
const CLIP_HIGH = 0.96;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let prev: Float32Array | null = null;

function ensure(): CanvasRenderingContext2D | null {
  if (!ctx) {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    // willReadFrequently keeps the surface in CPU memory — without it every
    // getImageData forces a GPU readback stall on the inference thread.
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  return ctx;
}

/**
 * Sample the current video frame. Returns null when the video isn't ready or
 * the canvas is unavailable. Call at most once per processed frame — the
 * motion figure is relative to the previous call.
 */
export function sampleImageStats(video: HTMLVideoElement): ImageStats | null {
  const c = ensure();
  if (!c || !video.videoWidth || video.readyState < 2) return null;

  try {
    c.drawImage(video, 0, 0, W, H);
  } catch {
    // Tainted/!ready surface — skip this frame.
    return null;
  }

  const data = c.getImageData(0, 0, W, H).data;
  const n = W * H;
  const luma = new Float32Array(n);

  let sum = 0;
  let clipLow = 0;
  let clipHigh = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    // Rec. 601 luma — matches how the eye weights the channels closely enough
    // for an exposure check, and avoids a gamma round-trip.
    const y = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255;
    luma[i] = y;
    sum += y;
    if (y <= CLIP_LOW) clipLow++;
    else if (y >= CLIP_HIGH) clipHigh++;
  }
  const mean = sum / n;

  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = luma[i] - mean;
    varSum += d * d;
  }

  let motion = 0;
  if (prev && prev.length === n) {
    let mSum = 0;
    for (let i = 0; i < n; i++) mSum += Math.abs(luma[i] - prev[i]);
    motion = mSum / n;
  }
  prev = luma;

  return {
    luma: round(mean),
    contrast: round(Math.sqrt(varSum / n)),
    motion: round(motion),
    clipLow: round(clipLow / n),
    clipHigh: round(clipHigh / n),
  };
}

/** Drop the motion reference so the next sample doesn't diff across a gap. */
export function resetImageStats(): void {
  prev = null;
}

function round(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}
