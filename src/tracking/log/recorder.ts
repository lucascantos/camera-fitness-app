// The tracking diagnostics recorder.
//
// One live set at a time. Training calls beginSet when a set starts,
// recordFrame from the per-frame MediaPipe callback, and endSet when the set
// finishes — at which point the trace is written to the log database along
// with the user's own rep count, which is the label that makes the trace
// useful.
//
// Everything here is a no-op while debug logging is off (see ./flag.ts), so
// the per-frame cost for a normal user is one boolean check. The pieces:
// ./activeSet (buffer + context), ./flatten (payload), ./persist (storage).

import type { Landmark } from "../helpers";
import { getDebugOptions, isDebugLogging } from "./flag";
import { resetImageStats, sampleImageStats } from "./frameStats";
import { getOrientation, startOrientation, stopOrientation } from "./deviceOrientation";
import { maybeCapture } from "./keyframes";
import {
  createActiveSet, pushFrame, MAX_FRAMES, MAX_KEYFRAMES,
  type ActiveSet, type BeginSetArgs,
} from "./activeSet";
import { flattenScreen, flattenWorld } from "./flatten";
import { persistSet, type SetResult } from "./persist";
import type { FrameMeta, FrameSample, GroundTruthEvent, ImageStats, TrackerDebug } from "./types";

export type { BeginSetArgs } from "./activeSet";

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
  return {
    recording: true,
    frames: active.wrapped ? MAX_FRAMES : active.head,
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

  active = createActiveSet(args, opts);
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
  pushFrame(a, sample);

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
 * The athlete tapped to mark one real rep. Timestamps are what turn a net
 * miscount into knowing which reps were missed and when.
 */
export function markRepTap(): number {
  const a = active;
  if (!a) return 0;
  a.repTaps.push(Math.round(performance.now() - a.t0));
  return a.repTaps.length;
}

/** How many rep taps have been recorded for the live set. */
export function getRepTapCount(): number {
  return active?.repTaps.length ?? 0;
}

/**
 * Finish and persist the current set. `actualReps` is the user's own count —
 * pass null when they didn't supply one. Returns the stored log id, or null
 * when nothing was being recorded.
 */
export async function endSet(result: SetResult): Promise<string | null> {
  const a = active;
  active = null;
  if (!a) return null;
  return persistSet(a, result);
}

/** Throw away the in-progress set without persisting it. */
export function abortSet(): void {
  active?.videoCapture?.cancel();
  active = null;
}

/** Release the orientation listener. Call when leaving the training scene. */
export function teardown(): void {
  active?.videoCapture?.cancel();
  active = null;
  stopOrientation();
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
