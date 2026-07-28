// Periodic JPEG stills, so a miscounted set can be watched back next to its
// angle trace.
//
// A numeric trace tells you the elbow angle never dropped below 100°; a picture
// tells you why (the user was side-on, the arm was out of frame, someone walked
// through the shot). This is the only capture source here that stores an image
// of the user, so it is opt-in, stays in the local IndexedDB log alongside the
// trace, and is deleted with it — consistent with the app's no-backend,
// no-telemetry rule.

const WIDTH = 160;      // enough to see body position, ~4-6 KB per still
const QUALITY = 0.5;
const MIN_INTERVAL_MS = 1000;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export interface Keyframe {
  t: number;
  dataUrl: string;
}

/**
 * Capture a still if at least MIN_INTERVAL_MS has passed since `lastAt`.
 * Returns null when it's too soon or the video isn't ready.
 */
export function maybeCapture(
  video: HTMLVideoElement,
  t: number,
  lastAt: number,
): Keyframe | null {
  if (t - lastAt < MIN_INTERVAL_MS) return null;
  if (!video.videoWidth || video.readyState < 2) return null;

  if (!ctx) {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
  }
  if (!canvas || !ctx) return null;

  const h = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * WIDTH));
  if (canvas.width !== WIDTH || canvas.height !== h) {
    canvas.width = WIDTH;
    canvas.height = h;
  }

  try {
    ctx.drawImage(video, 0, 0, WIDTH, h);
    return { t, dataUrl: canvas.toDataURL("image/jpeg", QUALITY) };
  } catch {
    return null;
  }
}
