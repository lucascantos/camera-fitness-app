// Ported from: tracking/exercises/generic.py (legacy FitnessApp repo)
//
// The single tracker behind every movement. Direction is implied by the
// thresholds rather than declared:
//
//   work < rest   small angle is the working position  (curl, squat, push-up)
//   work > rest   large angle is the working position  (overhead lockout,
//                                                       lateral raise top)
//
// Thresholds come from src/data/calibration/ rather than being hardcoded here.
//
// ── Within-set adaptation ────────────────────────────────────────────────────
//
// The same athlete performing the same movement measures very differently from
// one session to the next — in the captured data a barbell row's working angle
// bottomed out at 81° in one set and 123° in another, purely from where the
// phone was. No stored profile survives that, because the quantity that
// changed is the projection, not the body.
//
// So the tracker estimates the athlete's range from the set it is currently
// watching. Every frame is buffered; periodically the range is re-estimated
// from everything seen so far, and the state machine is re-run over the whole
// buffer under the revised thresholds. Re-counting rather than only applying
// the new thresholds going forward is what makes this free: no reps are lost
// to the observation window, because the observation window is re-counted.
//
// The displayed count never decreases (a rep bar that counts backwards is
// worse than a slightly wrong number). On the captured traces that guard is
// also *more* accurate than allowing decreases — total error 133 → 77.

import { angle3D, RepState, type Landmark } from "../helpers";
import type { ExerciseTracker, Side } from "./types";
import { checkPosture, type PostureConstraint } from "./posture";
import { buildDebug, crossCheckAngle, minVisibility } from "./diagnostics";
import { runStateMachine, type Sample } from "./stateMachine";
import { deriveThresholds } from "@/data/calibration/derive";
import type { AnchorPair } from "@/data/calibration/anchors";
import type { TrackerDebug } from "../log/types";

const CONFIRM_FRAMES_DEFAULT = 3;

/** Frames observed before the first range revision. */
const ADAPT_MIN_SAMPLES = 25;
/** Re-estimate every N frames — cheap, but no point doing it per frame. */
const ADAPT_EVERY = 10;
/** Cap the buffer so a very long set can't grow without bound. */
const MAX_SAMPLES = 4000;
/**
 * Percentiles taken as the observed rest and work anchors.
 *
 * Deliberately not the extremes. An anchor should describe where the athlete
 * *typically* gets to, not the furthest they ever got — anchoring on p5/p95 and
 * then demanding a return to rest+25% of that span asks them to match their
 * best-ever rep every time. Swept across the captured traces: p5/p95 scored 94,
 * p10/p90 86, p15/p85 78, p20/p80 75, p25/p75 83. The p5/p95 setting also made
 * overhead press *worse* than no adaptation at all, which is what surfaced the
 * problem.
 */
const LO_PCT = 0.20;
const HI_PCT = 0.80;

export interface AngleTrackerOptions {
  name: string;
  /** [a, b, c] — angle is measured at vertex b. */
  landmarks: [number, number, number];
  /** Per-side landmark triples, for unilateral movements. */
  sideLandmarks?: Record<Side, [number, number, number]>;
  /**
   * The opposite-side triple, enabling automatic side selection on bilateral
   * movements. The tracker watches both and counts on whichever the camera can
   * actually see — measured, one whole limb chain routinely drops to ~0.1
   * visibility while the other sits at ~0.95, purely from how the athlete is
   * turned. Ignored for unilateral exercises, where the side is the point.
   */
  mirrorLandmarks?: [number, number, number];
  /** Posture constraints for the mirrored side. */
  mirrorPosture?: PostureConstraint[];
  /** Angle at or beyond which the joint is in the working position. */
  workThreshold: number;
  /** Angle at or beyond which the joint is back at rest. */
  restThreshold: number;
  confirmFrames?: number;
  /** Form constraints that freeze the machine while violated. */
  posture?: PostureConstraint[];
  /** Per-side form constraints, for unilateral movements. */
  sidePosture?: Record<Side, PostureConstraint[]>;
  unilateral?: boolean;
  /**
   * Enables within-set range adaptation. The reference pair bounds how far the
   * observed range may stray from the population default, so one strange set
   * can't produce nonsense thresholds.
   */
  adaptive?: { reference: AnchorPair };
  /**
   * Extra angles recorded alongside the primary one. Diagnostics only — they
   * never gate counting. Useful for telling apart exercises that share a joint
   * (deadlift and barbell row both hinge at the hip), and for spotting when
   * the tracked side is the occluded one.
   */
  auxAngles?: Record<string, [number, number, number]>;
}

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

  /** Revise the thresholds from the range observed so far in this set. */
  function adapt() {
    if (!adaptive) return;
    const active = usingMirror ? mirrorSamples : samples;
    const angles = active.filter((s) => !s.blocked).map((s) => s.angle);
    if (angles.length < 15) return;
    const sorted = [...angles].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    const lo = at(LO_PCT);
    const hi = at(HI_PCT);
    const ref = adaptive.reference;
    const observed: AnchorPair = {
      ...ref,
      rest: inverted ? lo : hi,
      work: inverted ? hi : lo,
    };
    const t = deriveThresholds(observed, ref);
    work = t.work;
    rest = t.rest;
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
      if (!a || !b || !c) {
        debug = buildDebug({
          angle: lastAngle, state: "n/a", target: "n/a", confirm: 0, confirmFrames,
          formError, side: unilateral ? side : undefined,
          reason: "missing-landmark", minVisibility: vis, usedWorld, angleOther: null,
        });
        return count;
      }

      const angle = angle3D(a, b, c);
      if (!isFinite(angle)) {
        debug = buildDebug({
          angle: lastAngle, state: "n/a", target: "n/a", confirm: 0, confirmFrames,
          formError, side: unilateral ? side : undefined,
          reason: "non-finite-angle", minVisibility: vis, usedWorld, angleOther: null,
        });
        return count;
      }
      lastAngle = angle;

      const angleOther = crossCheckAngle(usedWorld ? screen : world, tri, usedWorld);
      const constraints = activePosture();

      let aux: Record<string, number> | undefined;
      if (auxAngles) {
        aux = {};
        for (const [key, t] of Object.entries(auxAngles)) {
          const v = crossCheckAngle(lms, t, !usedWorld);
          if (v !== null) aux[key] = v;
        }
        if (Object.keys(aux).length === 0) aux = undefined;
      }
      if (constraints?.length) {
        const pa = crossCheckAngle(lms, constraints[0].landmarks, !usedWorld);
        if (pa !== null) aux = { ...(aux ?? {}), posture: pa };
      }

      // Posture gate — bad form freezes the state machine so no rep counts.
      formError = constraints ? checkPosture(lms, constraints) : null;

      if (samples.length < MAX_SAMPLES) {
        samples.push({ angle, blocked: formError !== null });
        visSum += vis ?? 0;

        // Mirror side, sampled in lockstep so the two streams stay index-aligned
        // and a side change can re-count without re-reading anything.
        if (mirrorLandmarks) {
          const mVis = minVisibility(screen, mirrorLandmarks);
          const [mi, mj, mk] = mirrorLandmarks;
          const ma = lms[mi], mb = lms[mj], mc = lms[mk];
          const mAngle = ma && mb && mc ? angle3D(ma, mb, mc) : NaN;
          const mBlocked = mirrorPosture ? checkPosture(lms, mirrorPosture) !== null : false;
          // A missing mirror landmark reuses the primary angle rather than
          // dropping the sample: the two streams must stay the same length.
          mirrorSamples.push({
            angle: isFinite(mAngle) ? mAngle : angle,
            blocked: isFinite(mAngle) ? mBlocked : true,
          });
          mirrorVisSum += mVis ?? 0;
        }
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
