// Set-level schema for the tracking diagnostics log: everything that isn't
// per-frame. See ./types for the frame trace itself.

import type { Side } from "../exercises/types";
import type { FrameSample } from "./types";

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
