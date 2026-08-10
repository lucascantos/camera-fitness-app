// Ported from: tracking/exercises/generic.py (legacy FitnessApp repo)
//
// The single tracker behind every movement. Direction is implied by the
// thresholds rather than declared:
//
//   work < rest   small angle is the working position  (curl, squat, push-up)
//   work > rest   large angle is the working position  (overhead lockout,
//                                                       lateral raise top)
//
// Thresholds come from src/data/calibration/ rather than being hardcoded here,
// and are then revised within the set — see ./adaptation for why and how.
//
// The displayed count never decreases (a rep bar that counts backwards is
// worse than a slightly wrong number). On the captured traces that guard is
// also *more* accurate than allowing decreases — total error 133 → 77.

import { angle3D, RepState, type Landmark } from "../helpers";
import type { ExerciseTracker, Side } from "./types";
import { checkPosture, type PostureConstraint } from "./posture";
import { buildDebug, collectAux, crossCheckAngle, minVisibility } from "./diagnostics";
import { runStateMachine, type Sample } from "./stateMachine";
import {
  reviseThresholds, ADAPT_EVERY, ADAPT_MIN_SAMPLES, MAX_SAMPLES,
} from "./adaptation";
import type { AngleTrackerOptions } from "./angleOptions";
import type { TrackerDebug } from "../log/types";

export type { AngleTrackerOptions } from "./angleOptions";

const CONFIRM_FRAMES_DEFAULT = 3;

export function createAngleTracker(opts: AngleTrackerOptions): ExerciseTracker {
  const {
    name, landmarks, sideLandmarks, workThreshold, restThreshold,
    confirmFrames = CONFIRM_FRAMES_DEFAULT, posture, sidePosture,
    unilateral = false, adaptive, auxAngles,
    mirrorLandmarks, mirrorPosture,
  } = opts;

  let work = workThreshold;
  let rest = restThreshold;
  let inverted = work > rest;

  let side: Side = "right";
  // One sample stream per candidate side. Both are filled every frame; the
  // state machine runs over whichever side is currently chosen, and a change
  // of side re-counts from frame zero exactly like a threshold revision does.
  let samples: Sample[] = [];
  let mirrorSamples: Sample[] = [];
  let visSum = 0;
  let mirrorVisSum = 0;
  let usingMirror = false;
  let count = 0;
  let lastAngle: number | null = null;
  let formError: string | null = null;
  let debug: TrackerDebug | null = null;
  let cycles: number[] = [];
  let restCycles: number[] = [];
  let sinceAdapt = 0;

  function activeLandmarks(): [number, number, number] {
    return sideLandmarks ? sideLandmarks[side] : landmarks;
  }
  function activePosture(): PostureConstraint[] | undefined {
    return sidePosture ? sidePosture[side] : posture;
  }

  function resetAll() {
    samples = [];
    mirrorSamples = [];
    visSum = 0;
    mirrorVisSum = 0;
    usingMirror = false;
    count = 0;
    cycles = [];
    restCycles = [];
    lastAngle = null;
    formError = null;
    debug = null;
    sinceAdapt = 0;
    work = workThreshold;
    rest = restThreshold;
    inverted = work > rest;
  }

  function adapt() {
    if (!adaptive) return;
    const t = reviseThresholds(
      usingMirror ? mirrorSamples : samples, adaptive.reference, inverted,
    );
    if (!t) return;
    work = t.work;
    rest = t.rest;
  }

  /** Fill the mirror stream in lockstep so the two stay index-aligned. */
  function sampleMirror(lms: Landmark[], screen: Landmark[], primaryAngle: number) {
    if (!mirrorLandmarks) return;
    const mVis = minVisibility(screen, mirrorLandmarks);
    const [mi, mj, mk] = mirrorLandmarks;
    const ma = lms[mi], mb = lms[mj], mc = lms[mk];
    const mAngle = ma && mb && mc ? angle3D(ma, mb, mc) : NaN;
    const mBlocked = mirrorPosture ? checkPosture(lms, mirrorPosture) !== null : false;
    // A missing mirror landmark reuses the primary angle rather than dropping
    // the sample: the two streams must stay the same length.
    mirrorSamples.push({
      angle: isFinite(mAngle) ? mAngle : primaryAngle,
      blocked: isFinite(mAngle) ? mBlocked : true,
    });
    mirrorVisSum += mVis ?? 0;
  }

  return {
    name,
    get bands() { return { work, rest, inverted }; },
    unilateral: unilateral || undefined,
    get side() { return unilateral ? side : undefined; },
    get angle() { return lastAngle; },
    get repCount() { return count; },
    get formError() { return formError; },
    get debug() { return debug; },
    get cycles() { return cycles; },
    get restCycles() { return restCycles; },
    setSide: unilateral ? (next: Side) => { side = next; resetAll(); } : undefined,
    reset: resetAll,

    feed(screen: Landmark[], world: Landmark[] | null) {
      const lms = world ?? screen;
      const usedWorld = world !== null;
      const tri = activeLandmarks();
      // Screen landmarks always carry `visibility`; world ones may not.
      const vis = minVisibility(screen, tri);
      const [ai, bi, ci] = tri;
      const a = lms[ai], b = lms[bi], c = lms[ci];

      const bail = (reason: "missing-landmark" | "non-finite-angle") => {
        debug = buildDebug({
          angle: lastAngle, state: "n/a", target: "n/a", confirm: 0, confirmFrames,
          formError, side: unilateral ? side : undefined,
          reason, minVisibility: vis, usedWorld, angleOther: null,
        });
        return count;
      };
      if (!a || !b || !c) return bail("missing-landmark");

      const angle = angle3D(a, b, c);
      if (!isFinite(angle)) return bail("non-finite-angle");
      lastAngle = angle;

      const angleOther = crossCheckAngle(usedWorld ? screen : world, tri, usedWorld);
      const constraints = activePosture();

      const aux = collectAux(lms, !usedWorld, auxAngles, constraints?.[0]?.landmarks);

      // Posture gate — bad form freezes the state machine so no rep counts.
      formError = constraints ? checkPosture(lms, constraints) : null;

      if (samples.length < MAX_SAMPLES) {
        samples.push({ angle, blocked: formError !== null });
        visSum += vis ?? 0;
        sampleMirror(lms, screen, angle);
      }

      if (samples.length >= ADAPT_MIN_SAMPLES && ++sinceAdapt >= ADAPT_EVERY) {
        sinceAdapt = 0;
        // Choose the better-observed side before re-deriving thresholds, so the
        // range is measured on the limb we are actually going to count.
        if (mirrorLandmarks) usingMirror = mirrorVisSum > visSum;
        adapt();
      }

      const r = runStateMachine(
        usingMirror ? mirrorSamples : samples, work, rest, confirmFrames,
      );
      cycles = r.cycles;
      restCycles = r.restCycles;
      // Never let the displayed count go backwards when a revision reinterprets
      // earlier frames — see the header note.
      count = Math.max(count, r.count);

      const activeSample = usingMirror
        ? mirrorSamples[mirrorSamples.length - 1]
        : samples[samples.length - 1];
      debug = buildDebug({
        angle: activeSample?.angle ?? angle,
        state: r.state, target: r.target, confirm: r.confirm, confirmFrames,
        formError, side: unilateral ? side : usingMirror ? "left" : "right",
        minVisibility: usingMirror ? minVisibility(screen, mirrorLandmarks!) : vis,
        usedWorld, angleOther,
        aux: { ...(aux ?? {}), usingMirror: usingMirror ? 1 : 0 },
        reason: formError && !usingMirror ? "posture-gate" : r.reason,
      });
      return count;
    },
  };
}

export { RepState };
