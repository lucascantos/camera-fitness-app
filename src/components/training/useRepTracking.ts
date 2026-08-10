// Owns the per-frame half of the training screen: the exercise tracker, the
// MediaPipe loop that feeds it, the skeleton overlay, and the rep count the UI
// renders. Training.tsx keeps the navigation and the session writes.

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { useMediapipe } from "@/hooks/useMediapipe";
import { getTracker } from "@/tracking/exercises/registry";
import type { ExerciseTracker, Side } from "@/tracking/exercises/types";
import { createPoseRenderer } from "@/tracking/poseRenderer";
import { drawPoseOverlay } from "@/tracking/poseOverlay";
import { getSettings } from "@/data/settings/settings";
import { say } from "@/data/trainers/say";
import { switchSideChime, repBeep } from "@/audio/sfx";
import { isDebugLogging } from "@/tracking/log/flag";
import * as logRecorder from "@/tracking/log/recorder";
import type { FrameMeta, ImageStats } from "@/tracking/log/types";
import { announceRep } from "./repFeedback";

export interface RepTrackingArgs {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  exercise: string;
  targetReps: number;
  isAmrap: boolean;
  /** The set hit its target and auto-rest is on. */
  onAutoFinish(reps: number): void;
  /** Same, but diagnostics are recording — ask for the real count instead. */
  onConfirmCount(): void;
}

export function useRepTracking(args: RepTrackingArgs) {
  const { videoRef, canvasRef, exercise, targetReps, isAmrap } = args;

  const trackerRef = useRef<ExerciseTracker | null>(null);
  const poseRendererRef = useRef(createPoseRenderer());
  const [reps, setReps] = useState(0);
  // For unilateral exercises (one-arm): which arm is currently being counted.
  // "right" first, then "left"; the set advances only after both are done.
  const [side, setSide] = useState<Side>("right");
  const lastRepRef = useRef(0);

  // Mirrors of the latest frame for the debug overlay, so it can read them
  // without a React update per frame.
  const imageStatsRef = useRef<ImageStats | null>(null);
  const frameTimingRef = useRef({ fps: 0, dtMs: 0, skip: 0 });

  // Always point at the current render's callbacks: onResult is memoised and
  // would otherwise close over a stale set cursor, writing actuals onto the
  // wrong set whenever consecutive sets share the same reps/weight.
  const cbRef = useRef(args);
  cbRef.current = args;

  useEffect(() => {
    const tk = getTracker(exercise);
    trackerRef.current = tk;
    setReps(0);
    lastRepRef.current = 0;
    // Unilateral exercises always start on the right arm.
    setSide("right");
    tk?.setSide?.("right");
    say("intro", exercise);
  }, [exercise]);

  /** Finish the current arm and move to the other one. */
  const switchToLeft = useCallback(() => {
    const t = trackerRef.current;
    if (!t?.unilateral) return;
    t.setSide?.("left");
    setSide("left");
    lastRepRef.current = 0;
    setReps(0);
    switchSideChime();
  }, []);

  // MediaPipe — fires once per frame with landmarks.
  const onResult = useCallback((res: PoseLandmarkerResult, _ts: number, meta: FrameMeta) => {
    const screenLms = res.landmarks?.[0];
    const worldLms = res.worldLandmarks?.[0] ?? null;

    drawPoseOverlay(
      canvasRef.current, videoRef.current, screenLms,
      poseRendererRef.current, getSettings().poseStyle,
    );

    const t = trackerRef.current;
    if (!t || !screenLms) {
      // A frame with no pose at all is itself a finding — the user stepped out
      // of shot, or detection dropped — so it still goes in the trace.
      if (isDebugLogging()) {
        frameTimingRef.current = { fps: meta.fps, dtMs: meta.dtMs, skip: meta.skip };
        logRecorder.recordFrame(null, null, null, lastRepRef.current, meta);
      }
      return;
    }
    const c = t.feed(screenLms, worldLms);

    if (isDebugLogging()) {
      frameTimingRef.current = { fps: meta.fps, dtMs: meta.dtMs, skip: meta.skip };
      logRecorder.recordFrame(screenLms, worldLms, t.debug ?? null, c, meta);
      imageStatsRef.current = logRecorder.getLastImageStats();
    }

    if (c === lastRepRef.current) return;

    // Unilateral: after the right arm hits target, switch to the left and keep
    // the set open. The set only advances once both arms are done. This path
    // plays a dedicated swap cue instead of the set-complete chime.
    if (!isAmrap && c >= targetReps && t.unilateral && side === "right") {
      repBeep();        // the rep that finished the right arm still counts
      switchToLeft();   // distinct "change arms" cue
      return;
    }

    announceRep(c, targetReps, isAmrap);
    lastRepRef.current = c;
    setReps(c);
    if (isAmrap || c < targetReps || !getSettings().autoRest) return;

    // While recording diagnostics, auto-advance would skip straight past the
    // "how many did you actually do?" prompt — which is the label that makes
    // the whole trace worth keeping. Open the sheet instead and let the user
    // confirm or correct the count. Otherwise a tiny delay gives the
    // set-complete line a beat to play.
    if (isDebugLogging()) setTimeout(() => cbRef.current.onConfirmCount(), 600);
    else setTimeout(() => cbRef.current.onAutoFinish(c), 600);
  }, [targetReps, isAmrap, side, switchToLeft, canvasRef, videoRef]);

  const mp = useMediapipe(videoRef, onResult, !!trackerRef.current);

  return {
    trackerRef,
    reps,
    side,
    isUnilateral: trackerRef.current?.unilateral ?? false,
    switchToLeft,
    imageStatsRef,
    frameTimingRef,
    mpReady: mp.ready,
    mpError: mp.error,
    lowPerf: mp.lowPerf,
  };
}
