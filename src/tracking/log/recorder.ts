// The tracking diagnostics recorder.
//
// One live set at a time. Training.tsx calls beginSet when a set starts,
// recordFrame from the per-frame MediaPipe callback, and endSet when the set
// finishes — at which point the trace is written to the log database along
// with the user's own rep count, which is the label that makes the trace
// useful.
//
// Everything here is a no-op while debug logging is off (see ./flag.ts), so
// the per-frame cost for a normal user is one boolean check.

import { getGpuStatus } from "../gpuStatus";
import { getSettings } from "@/data/settings/settings";
import type { Landmark } from "../helpers";
import type { Side } from "../exercises/types";
import { getDebugOptions, isDebugLogging } from "./flag";
import { resetImageStats, sampleImageStats } from "./frameStats";
import {
  getOrientation,
  getScreenOrientationAngle,
  startOrientation,
  stopOrientation,
} from "./deviceOrientation";
import { maybeCapture } from "./keyframes";
import { putSetLog } from "./logDb";
import type {
  FrameMeta,
  FrameSample,
  GroundTruthEvent,
  ImageStats,
  SetLog,
  SetCycles,
  SetLogContext,
  TrackerDebug,
} from "./types";

// ~3 minutes at 30 fps. Past this the ring wraps and the oldest frames go —
// a set that runs longer than this is not the interesting case.
const MAX_FRAMES = 5400;
const MAX_KEYFRAMES = 120;

/** Landmark subset logged when fullLandmarks is off — the joints trackers read. */
const CORE_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export interface BeginSetArgs {
  video: HTMLVideoElement | null;
  stream: MediaStream | null;
  exercise: string;
  targetReps: number;
  weight: number;
  isAmrap: boolean;
  side: Side | null;
  unilateral: boolean;
  workoutIdx: number;
  setIdx: number;
  poseModel: string;
  calibration: SetLogContext["calibration"];
}

interface ActiveSet {
  id: string;
  startedAt: number;
  t0: number;
  context: SetLogContext;
  video: HTMLVideoElement | null;
  /** Circular frame buffer. */
  buf: (FrameSample | undefined)[];
  head: number;
  wrapped: boolean;
  events: GroundTruthEvent[];
  keyframes: { t: number; dataUrl: string }[];
  lastKeyframeAt: number;
  hiddenSince: number | null;
}

let active: ActiveSet | null = null;
let visibilityBound = false;
// Cached so the debug overlay can display the current exposure/motion figures
// without paying for a second sample of the same frame.
let lastImage: ImageStats | null = null;

export function getLastImageStats(): ImageStats | null {
  return lastImage;
}

/** Live counters for the on-screen debug overlay. */
export interface LiveStats {
  recording: boolean;
  frames: number;
  droppedFrames: number;
  elapsedMs: number;
}

export function getLiveStats(): LiveStats {
  if (!active) return { recording: false, frames: 0, droppedFrames: 0, elapsedMs: 0 };
  const frames = active.wrapped ? MAX_FRAMES : active.head;
  return {
    recording: true,
    frames,
    droppedFrames: active.wrapped ? active.head : 0,
    elapsedMs: performance.now() - active.t0,
  };
}

export function isRecording(): boolean {
  return active !== null;
}

/**
 * Start recording a set. Silently does nothing while logging is disabled.
 * Any set already in progress is discarded — a set boundary is a hard reset.
 */
export function beginSet(args: BeginSetArgs): void {
  if (!isDebugLogging()) return;
  const opts = getDebugOptions();

  if (opts.orientation) {
    // Fire-and-forget: on iOS this only succeeds if we happen to be inside a
    // user gesture, and a denial just means null orientation samples.
    void startOrientation();
  }
  resetImageStats();
  bindVisibility();

  const gpu = getGpuStatus();
  const settings = getSettings();
  const video = args.video;
  const track = args.stream?.getVideoTracks()[0] ?? null;

  active = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    t0: performance.now(),
    video,
    buf: new Array(MAX_FRAMES),
    head: 0,
    wrapped: false,
    events: [],
    keyframes: [],
    lastKeyframeAt: -Infinity,
    hiddenSince: null,
    context: {
      exercise: args.exercise,
      targetReps: args.targetReps,
      weight: args.weight,
      isAmrap: args.isAmrap,
      side: args.side,
      unilateral: args.unilateral,
      workoutIdx: args.workoutIdx,
      setIdx: args.setIdx,
      cameraSettings: track ? safeTrackSettings(track) : null,
      videoWidth: video?.videoWidth ?? 0,
      videoHeight: video?.videoHeight ?? 0,
      screenOrientation: getScreenOrientationAngle(),
      gpu: {
        renderer: gpu.renderer,
        hardwareAccelerated: gpu.hardwareAccelerated,
        webglAvailable: gpu.webglAvailable,
      },
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory: deviceMemory(),
      devicePixelRatio: window.devicePixelRatio,
      heightCm: settings.heightCm,
      poseModel: args.poseModel,
      landmarkIndices: opts.fullLandmarks ? null : CORE_LANDMARKS,
      calibration: args.calibration,
    },
  };
}

/**
 * Record one processed frame. Called from the MediaPipe result callback, so
 * this runs on the frame budget — it stays allocation-light and does no I/O.
 */
export function recordFrame(
  screen: Landmark[] | null,
  world: Landmark[] | null,
  tracker: TrackerDebug | null,
  reps: number,
  meta: FrameMeta,
): void {
  const a = active;
  if (!a || !isDebugLogging()) return;
  const opts = getDebugOptions();
  const t = Math.round(performance.now() - a.t0);

  // beginSet fires before the <video> has metadata, so its dimensions read as
  // 0x0 there. Backfill from the first frame that knows them.
  if (!a.context.videoWidth && a.video?.videoWidth) {
    a.context.videoWidth = a.video.videoWidth;
    a.context.videoHeight = a.video.videoHeight;
  }

  lastImage = opts.imageStats && a.video ? sampleImageStats(a.video) : null;

  const sample: FrameSample = {
    t,
    meta,
    screen: flattenScreen(screen, opts.fullLandmarks),
    world: flattenWorld(world, opts.fullLandmarks),
    image: lastImage,
    orientation: opts.orientation ? getOrientation() : null,
    tracker,
    reps,
  };
  if (a.hiddenSince != null) sample.hidden = true;

  a.buf[a.head % MAX_FRAMES] = sample;
  a.head++;
  if (a.head >= MAX_FRAMES) a.wrapped = true;

  if (opts.keyframes && a.video && a.keyframes.length < MAX_KEYFRAMES) {
    const kf = maybeCapture(a.video, t, a.lastKeyframeAt);
    if (kf) {
      a.keyframes.push(kf);
      a.lastKeyframeAt = t;
    }
  }
}

/**
 * Log a user correction against the current trace. "missed-rep" means the user
 * did a rep the tracker ignored; "false-rep" means it counted something that
 * wasn't one. These are the timestamps you scrub to when reading a trace back.
 */
export function markEvent(kind: GroundTruthEvent["kind"]): void {
  const a = active;
  if (!a) return;
  a.events.push({ t: Math.round(performance.now() - a.t0), kind });
}

/**
 * Finish and persist the current set. `actualReps` is the user's own count —
 * pass null when they didn't supply one. Returns the stored log id, or null
 * when nothing was being recorded.
 */
export async function endSet(result: {
  countedReps: number | null;
  actualReps?: number | null;
  note?: string | null;
  cycles?: SetCycles | null;
}): Promise<string | null> {
  const a = active;
  active = null;
  if (!a) return null;

  const log: SetLog = {
    id: a.id,
    startedAt: a.startedAt,
    endedAt: Date.now(),
    context: a.context,
    frames: drain(a),
    truncated: a.wrapped,
    events: a.events,
    countedReps: result.countedReps,
    actualReps: result.actualReps ?? null,
    note: result.note ?? null,
    keyframes: a.keyframes,
    cycles: result.cycles ?? null,
  };

  try {
    await putSetLog(log);
    return log.id;
  } catch (e) {
    // Quota or a blocked upgrade — losing a diagnostic trace must never break
    // the workout, so this is swallowed with a console note.
    console.warn("[tracking-log] failed to persist set log", e);
    return null;
  }
}

/** Throw away the in-progress set without persisting it. */
export function abortSet(): void {
  active = null;
}

/** Release the orientation listener. Call when leaving the training scene. */
export function teardown(): void {
  active = null;
  stopOrientation();
}

// ── internals ────────────────────────────────────────────────────────────────

/** Read the circular buffer back in chronological order. */
function drain(a: ActiveSet): FrameSample[] {
  const out: FrameSample[] = [];
  const n = a.wrapped ? MAX_FRAMES : a.head;
  const start = a.wrapped ? a.head % MAX_FRAMES : 0;
  for (let i = 0; i < n; i++) {
    const f = a.buf[(start + i) % MAX_FRAMES];
    if (f) out.push(f);
  }
  return out;
}

// Landmarks are the bulk of the payload, so they go in flat and rounded rather
// than as objects: 4 numbers per screen landmark (x, y, z, visibility) and 3
// per world landmark (x, y, z in metres).
function flattenScreen(lms: Landmark[] | null, full: boolean): number[] | null {
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

function flattenWorld(lms: Landmark[] | null, full: boolean): number[] | null {
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

// A backgrounded tab stops rAF entirely, which looks identical to a tracker
// that stopped counting. Flagging the frames either side of a hide makes that
// unambiguous when reading the trace back.
function bindVisibility() {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (!active) return;
    active.hiddenSince = document.hidden ? performance.now() : null;
  });
}

function safeTrackSettings(track: MediaStreamTrack): Record<string, unknown> | null {
  try {
    return { ...track.getSettings(), readyState: track.readyState, label: track.label };
  } catch {
    return null;
  }
}

function deviceMemory(): number | null {
  const v = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof v === "number" ? v : null;
}
