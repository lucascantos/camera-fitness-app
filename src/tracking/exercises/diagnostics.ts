// Shared helpers for building a tracker's TrackerDebug record.
//
// Two things every tracker should report but none currently computes:
//
//   minVisibility — MediaPipe returns a `visibility` score per landmark and
//   nothing in the counting path reads it. A landmark behind the torso still
//   comes back with plausible coordinates, so angle3D happily produces a
//   confident-looking number from a guess. Logging the lowest visibility across
//   the joints a tracker actually used is how we find out whether the miscounts
//   correlate with occlusion.
//
//   angleOther — trackers use `world ?? screen` and never look back. Computing
//   the same angle from the other landmark set gives a free confidence signal:
//   when the 2D and 3D figures diverge sharply, the pose estimate is shaky.
//
// Neither is used to gate counting — this pass only measures.

import { angle2D, angle3D, type Landmark } from "../helpers";
import type { NoCountReason, TrackerDebug } from "../log/types";
import { RepState } from "../helpers";

/** Lowest `visibility` across the given landmark indices; null if none carry it. */
export function minVisibility(lms: Landmark[], indices: number[]): number | null {
  let min: number | null = null;
  for (const i of indices) {
    const v = lms[i]?.visibility;
    if (typeof v !== "number") continue;
    if (min === null || v < min) min = v;
  }
  return min;
}

/**
 * The same 3-point angle measured on a different landmark set, or null.
 *
 * `planar` must be set when measuring on *screen* landmarks. Their `z` is not
 * in the same unit scale as `x`/`y` (it's a depth offset relative to the hip
 * midpoint, expressed roughly in image-width units), so feeding them to
 * angle3D produces a geometrically meaningless number. The first captured
 * trace showed a median 57° "divergence" between the world and screen figures
 * that was entirely this artefact rather than a real confidence signal.
 */
export function crossCheckAngle(
  lms: Landmark[] | null,
  [ai, bi, ci]: [number, number, number],
  planar = false,
): number | null {
  if (!lms) return null;
  const a = lms[ai], b = lms[bi], c = lms[ci];
  if (!a || !b || !c) return null;
  const v = planar ? angle2D(a, b, c) : angle3D(a, b, c);
  return isFinite(v) ? round(v) : null;
}

/**
 * Named secondary angles for one frame: the tracker's configured aux triples,
 * plus its first posture constraint. Diagnostics only — nothing here gates
 * counting. Returns undefined when none of them could be measured.
 */
export function collectAux(
  lms: Landmark[],
  planar: boolean,
  auxAngles?: Record<string, [number, number, number]>,
  postureTriple?: [number, number, number],
): Record<string, number> | undefined {
  let aux: Record<string, number> | undefined;
  if (auxAngles) {
    aux = {};
    for (const [key, t] of Object.entries(auxAngles)) {
      const v = crossCheckAngle(lms, t, planar);
      if (v !== null) aux[key] = v;
    }
    if (Object.keys(aux).length === 0) aux = undefined;
  }
  if (postureTriple) {
    const pa = crossCheckAngle(lms, postureTriple, planar);
    if (pa !== null) aux = { ...(aux ?? {}), posture: pa };
  }
  return aux;
}

/**
 * Classify why the frame didn't produce a rep, from the state machine's own
 * variables. `flipped` is whether state changed on this frame, `counted`
 * whether the count went up.
 */
export function noCountReason(args: {
  state: RepState;
  target: RepState;
  confirm: number;
  prevConfirm: number;
  flipped: boolean;
  counted: boolean;
}): NoCountReason {
  const { state, target, confirm, prevConfirm, flipped, counted } = args;
  if (counted) return "counted";
  if (flipped) return "entered-work-zone";
  if (target === RepState.MID) return "mid-zone";
  if (target !== state) return confirm > 0 ? "confirming" : "confirm-reset";
  if (prevConfirm > 0 && confirm === 0) return "confirm-reset";
  return state === RepState.CURLED ? "in-work-zone" : "in-rest-zone";
}

export function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Assemble the record. Kept in one place so every tracker reports the same shape. */
export function buildDebug(fields: Omit<TrackerDebug, "angle"> & { angle: number | null }): TrackerDebug {
  return {
    ...fields,
    angle: fields.angle === null ? null : round(fields.angle),
  };
}
