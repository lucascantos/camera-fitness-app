// Device tilt, for phones propped at an angle.
//
// Every tracker measures joint angles that the camera's own orientation
// distorts. A phone leaning against a water bottle at 20° rotates the whole
// scene, and a squat filmed from a low floor angle foreshortens the knee joint
// enough to move it out of the fixed DEPTH_THRESHOLD band. Logging beta/gamma
// tells us whether a failing set was shot from a sane camera position before we
// go blaming the thresholds.
//
// Desktop browsers never fire these events; iOS requires an explicit
// user-gesture permission grant. Both cases degrade to null samples.

import type { OrientationSample } from "./types";

let latest: OrientationSample | null = null;
let listening = false;

type PermissionCapableCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function handler(e: DeviceOrientationEvent) {
  latest = {
    alpha: e.alpha == null ? null : round(e.alpha),
    beta: e.beta == null ? null : round(e.beta),
    gamma: e.gamma == null ? null : round(e.gamma),
  };
}

/**
 * Start listening. On iOS this must be called from a user gesture or the
 * permission request is rejected. Resolves false when unsupported or denied.
 */
export async function startOrientation(): Promise<boolean> {
  if (listening) return true;
  if (typeof DeviceOrientationEvent === "undefined") return false;

  const ctor = DeviceOrientationEvent as PermissionCapableCtor;
  if (typeof ctor.requestPermission === "function") {
    try {
      if ((await ctor.requestPermission()) !== "granted") return false;
    } catch {
      // Thrown when not called from a user gesture.
      return false;
    }
  }

  window.addEventListener("deviceorientation", handler);
  listening = true;
  return true;
}

export function stopOrientation(): void {
  if (!listening) return;
  window.removeEventListener("deviceorientation", handler);
  listening = false;
  latest = null;
}

/** Most recent sample, or null if no event has arrived yet. */
export function getOrientation(): OrientationSample | null {
  return latest;
}

/** Screen rotation in degrees — portrait vs landscape at set start. */
export function getScreenOrientationAngle(): number | null {
  const angle = window.screen?.orientation?.angle;
  return typeof angle === "number" ? angle : null;
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
