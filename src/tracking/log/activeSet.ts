// The in-progress recording: its circular frame buffer and the device/camera
// context captured once at set start.

import { getGpuStatus } from "../gpuStatus";
import { getSettings } from "@/data/settings/settings";
import type { Side } from "../exercises/types";
import { getScreenOrientationAngle } from "./deviceOrientation";
import { startVideoCapture, type VideoCapture } from "./videoCapture";
import { POSE_OPTIONS } from "@/hooks/useMediapipe";
import { CORE_LANDMARKS } from "./flatten";
import type {
  FrameSample, GroundTruthEvent, SetLogContext,
} from "./types";

// ~3 minutes at 30 fps. Past this the ring wraps and the oldest frames go —
// a set that runs longer than this is not the interesting case.
export const MAX_FRAMES = 5400;
export const MAX_KEYFRAMES = 120;

// Injected by vite.config.ts. Read defensively: these are bare globals rather
// than imports, so if the define ever fails to apply — a dev server started
// before the config changed, a test runner, an unusual bundler — referencing
// them directly throws a ReferenceError and takes the whole set down. A trace
// with an unknown build id is worth far more than a crashed workout.
const BUILD = {
  id: typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "unknown",
  time: typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "",
};

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

export interface ActiveSet {
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
  repTaps: number[];
  videoCapture: VideoCapture | null;
}

export function createActiveSet(
  args: BeginSetArgs,
  opts: { video: boolean; fullLandmarks: boolean },
): ActiveSet {
  const gpu = getGpuStatus();
  const settings = getSettings();
  const video = args.video;
  const track = args.stream?.getVideoTracks()[0] ?? null;

  return {
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
    repTaps: [],
    // Records the raw camera stream so upstream changes (resolution, model,
    // confidence params) can be re-run offline against the same movement.
    videoCapture: opts.video ? startVideoCapture(args.stream) : null,
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
      build: BUILD,
      poseOptions: { ...POSE_OPTIONS },
      landmarkIndices: opts.fullLandmarks ? null : CORE_LANDMARKS,
      calibration: args.calibration,
    },
  };
}

export function pushFrame(a: ActiveSet, sample: FrameSample): void {
  a.buf[a.head % MAX_FRAMES] = sample;
  a.head++;
  if (a.head >= MAX_FRAMES) a.wrapped = true;
}

/** Read the circular buffer back in chronological order. */
export function drain(a: ActiveSet): FrameSample[] {
  const out: FrameSample[] = [];
  const n = a.wrapped ? MAX_FRAMES : a.head;
  const start = a.wrapped ? a.head % MAX_FRAMES : 0;
  for (let i = 0; i < n; i++) {
    const f = a.buf[(start + i) % MAX_FRAMES];
    if (f) out.push(f);
  }
  return out;
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
