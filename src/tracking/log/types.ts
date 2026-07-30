// Schema for the tracking diagnostics log.
//
// The rep counters are fixed-threshold state machines (see
// src/tracking/exercises/*). When one miscounts, the app currently gives no
// clue *why* — was the landmark occluded, did the angle never cross the
// threshold, did the posture gate freeze the machine, or did the adaptive
// frame-skip in useMediapipe swallow the top of the rep? This log captures
// enough per frame to answer that question after the fact, and pairs each set
// with the user's own count so the traces are labelled data rather than
// guesswork.
//
// Recording is dev-only and off by default — see ./flag.ts.

import type { Side } from "../exercises/types";

/** Why the tracker did not increment the count on this frame. */
export type NoCountReason =
  /** A rep was counted on this frame. */
  | "counted"
  /** One of the landmarks the tracker needs was absent from the result. */
  | "missing-landmark"
  /** The angle came back NaN/Infinity (degenerate limb geometry). */
  | "non-finite-angle"
  /** A posture constraint was violated, so the state machine is frozen. */
  | "posture-gate"
  /** Angle sits between the work and rest thresholds — the dead band. */
  | "mid-zone"
  /** Holding in the working position (e.g. at the bottom of a squat). */
  | "in-work-zone"
  /** Holding in the rest position. */
  | "in-rest-zone"
  /** A state flip is pending, waiting on CONFIRM_FRAMES consecutive readings. */
  | "confirming"
  /** A state flip was in progress and the reading fell back — jitter. */
  | "confirm-reset"
  /** State flipped, but rest → work, which by design does not count. */
  | "entered-work-zone";

/**
 * A tracker's internal state for one frame. Every tracker fills this in
 * alongside its normal work; nothing here feeds back into counting.
 */
export interface TrackerDebug {
  /** Primary angle of interest, degrees. */
  angle: number | null;
  /** Current state-machine state. */
  state: string;
  /** State the angle classified to on this frame. */
  target: string;
  /** Consecutive-frame confirmation counter. */
  confirm: number;
  /** Frames required to flip state — logged because it's a per-tracker const. */
  confirmFrames: number;
  /** Active posture hint, or null when form passes. */
  formError: string | null;
  /** Active side, for unilateral trackers. */
  side?: Side;
  reason: NoCountReason;
  /**
   * Lowest `visibility` across the landmarks this tracker actually read.
   * Nothing in the counting path checks visibility today, so this is the
   * field that reveals reps computed from hallucinated landmarks.
   */
  minVisibility: number | null;
  /** Whether the angle came from worldLandmarks (true) or screen (false). */
  usedWorld: boolean;
  /**
   * Same angle recomputed from the other landmark set. Large disagreement
   * between the screen and world figure is a good confidence proxy.
   */
  angleOther: number | null;
  /** Named secondary angles — posture constraints, joint pairs, etc. */
  aux?: Record<string, number>;
}

/** Timing and throttle state for one processed frame, from useMediapipe. */
export interface FrameMeta {
  /** performance.now() at the time the frame was submitted for inference. */
  ts: number;
  /** Milliseconds since the previous *processed* frame. */
  dtMs: number;
  /** How long detectForVideo blocked for. */
  inferenceMs: number;
  /** Smoothed processed-frame FPS. */
  fps: number;
  /** Current frame-skip level (process 1 of every skip+1 eligible frames). */
  skip: number;
  /** Current inference longest-side target, in pixels. */
  maxDim: number;
}

/** Cheap image-quality measures sampled from the camera frame. */
export interface ImageStats {
  /** Mean luminance, 0–1. */
  luma: number;
  /** Luminance standard deviation, 0–1 — a contrast proxy. */
  contrast: number;
  /** Mean absolute luminance change vs the previous sample, 0–1. */
  motion: number;
  /** Fraction of sampled pixels at/near 0 — crushed shadows. */
  clipLow: number;
  /** Fraction of sampled pixels at/near 1 — blown highlights (backlighting). */
  clipHigh: number;
}

/** Device tilt from DeviceOrientationEvent, degrees. */
export interface OrientationSample {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

/**
 * One recorded frame. Landmarks are stored flat and rounded to keep a
 * multi-minute set to a few megabytes:
 *   screen — 4 numbers per landmark (x, y, z, visibility)
 *   world  — 3 numbers per landmark (x, y, z, in metres)
 */
export interface FrameSample {
  /** Milliseconds since the set's recording started. */
  t: number;
  meta: FrameMeta;
  screen: number[] | null;
  world: number[] | null;
  image: ImageStats | null;
  orientation: OrientationSample | null;
  tracker: TrackerDebug | null;
  /** The tracker's rep count as of this frame. */
  reps: number;
  /** Set when the page was hidden — rAF stalls and reps get lost here. */
  hidden?: true;
}

/** A user-supplied correction, timestamped against the frame trace. */
export interface GroundTruthEvent {
  t: number;
  kind: "missed-rep" | "false-rep";
}

/**
 * One tap by the athlete marking a real rep, in ms since recording started.
 * A total count says six reps were missed; these say *which* six, which is what
 * lets a failure be aligned to a moment in the trace.
 */
export type RepTap = number;

/** Everything that isn't per-frame: device, camera, and set context. */
export interface SetLogContext {
  exercise: string;
  targetReps: number;
  weight: number;
  isAmrap: boolean;
  side: Side | null;
  unilateral: boolean;
  workoutIdx: number;
  setIdx: number;
  /** Result of getUserMedia track.getSettings() — what the camera actually gave. */
  cameraSettings: Record<string, unknown> | null;
  videoWidth: number;
  videoHeight: number;
  /** Screen orientation angle at set start (0/90/180/270). */
  screenOrientation: number | null;
  gpu: { renderer: string; hardwareAccelerated: boolean; webglAvailable: boolean };
  userAgent: string;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  devicePixelRatio: number;
  /** From settings — body height feeds any future scale normalisation. */
  heightCm: number;
  poseModel: string;
  /**
   * Which build produced this trace. Without it, comparing captures across a
   * code change is guesswork — we hit exactly that while iterating.
   */
  build: { id: string; time: string };
  /**
   * The landmarker options the model actually ran under. Any change to these
   * invalidates comparison with earlier traces, so they travel with the data.
   */
  poseOptions: Record<string, unknown>;
  /**
   * Which landmark indices the frame rows contain, in order. null means all 33
   * in MediaPipe's native order. Recorded so an export is readable without
   * knowing which flag was set when it was captured.
   */
  landmarkIndices: number[] | null;
  /**
   * The thresholds the set *opened* with, from population defaults. The tracker
   * adapts away from these during the set, so this is a starting point rather
   * than a description of how the set was counted — but without it a trace
   * can't be interpreted at all, since the same angles mean different things
   * under different thresholds.
   */
  calibration: {
    work: number;
    rest: number;
    inverted: boolean;
    deadBand: number;
  } | null;
}

/** Working extremes of each rep in the set — what calibration learns from. */
export interface SetCycles {
  extremes: number[];
  /** Rest extreme of each rep — the only rest anchor floor movements produce. */
  restExtremes: number[];
  trusted: boolean;
}

/** One recorded set: context, the frame trace, and the ground-truth label. */
export interface SetLog {
  id: string;
  startedAt: number;
  endedAt: number | null;
  context: SetLogContext;
  frames: FrameSample[];
  /** True when the ring buffer wrapped and early frames were dropped. */
  truncated: boolean;
  events: GroundTruthEvent[];
  /** What the tracker counted. */
  countedReps: number | null;
  /** What the user says actually happened. The label. */
  actualReps: number | null;
  /** Free-text note the user can add when ending the set. */
  note: string | null;
  /** JPEG data URLs sampled through the set, when keyframe capture is on. */
  keyframes: { t: number; dataUrl: string }[];
  /** Per-rep working extremes and whether they were fed into the profile. */
  cycles: SetCycles | null;
  /** Athlete-tapped rep timestamps, when rep-tap mode was on. */
  repTaps: RepTap[];
  /** Set when a camera recording was stored alongside this trace. */
  video: { mimeType: string; bytes: number } | null;
}

/** Row shown in the log browser — the summary without the frame payload. */
export interface SetLogSummary {
  id: string;
  startedAt: number;
  exercise: string;
  countedReps: number | null;
  actualReps: number | null;
  frameCount: number;
  durationMs: number;
  bytes: number;
}
