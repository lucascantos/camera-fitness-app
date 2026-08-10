// Landmarks are the bulk of a trace's payload, so they go in flat and rounded
// rather than as objects: 4 numbers per screen landmark (x, y, z, visibility)
// and 3 per world landmark (x, y, z in metres).

import type { Landmark } from "../helpers";

/** Landmark subset logged when fullLandmarks is off — the joints trackers read. */
export const CORE_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export function flattenScreen(lms: Landmark[] | null, full: boolean): number[] | null {
  if (!lms) return null;
  const idx = full ? null : CORE_LANDMARKS;
  const n = idx ? idx.length : lms.length;
  const out = new Array<number>(n * 4);
  for (let i = 0; i < n; i++) {
    const lm = lms[idx ? idx[i] : i];
    const o = i * 4;
    if (!lm) {
      out[o] = out[o + 1] = out[o + 2] = out[o + 3] = NaN;
      continue;
    }
    out[o] = r4(lm.x);
    out[o + 1] = r4(lm.y);
    out[o + 2] = r4(lm.z);
    out[o + 3] = lm.visibility == null ? NaN : r4(lm.visibility);
  }
  return out;
}

export function flattenWorld(lms: Landmark[] | null, full: boolean): number[] | null {
  if (!lms) return null;
  const idx = full ? null : CORE_LANDMARKS;
  const n = idx ? idx.length : lms.length;
  const out = new Array<number>(n * 3);
  for (let i = 0; i < n; i++) {
    const lm = lms[idx ? idx[i] : i];
    const o = i * 3;
    if (!lm) {
      out[o] = out[o + 1] = out[o + 2] = NaN;
      continue;
    }
    out[o] = r4(lm.x);
    out[o + 1] = r4(lm.y);
    out[o + 2] = r4(lm.z);
  }
  return out;
}

function r4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}
