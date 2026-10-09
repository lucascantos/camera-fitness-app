// Owns the per-frame half of the training screen: the exercise tracker, the
// MediaPipe loop that feeds it, the skeleton overlay, and the rep count the UI
// renders. Training.tsx keeps the navigation and the session writes.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { useMediapipe } from "@/hooks/useMediapipe";
import { getTracker } from "@/tracking/exercises/registry";
import type { ExerciseTracker, Side } from "@/tracking/exercises/types";
import { createPoseRenderer } from "@/tracking/poseRenderer";
import { drawPoseOverlay } from "@/tracking/poseOverlay";
import { getSettings } from "@/data/settings/settings";
import { switchSideChime } from "@/audio/sfx";
import { isDebugLogging } from "@/tracking/log/flag";
import * as logRecorder from "@/tracking/log/recorder";
import type { FrameMeta } from "@/tracking/log/types";
import { announceRep, beepRep } from "./repFeedback";
import { useSessionStore } from "@/stores/sessionStore";
import { recordRep, recordSample } from "@/tracking/setTrace";

export interface RepTrackingArgs {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  exercise: string;
  targetReps: number;
  isAmrap: boolean;
  /**
   * False while the athlete is still setting up. The skeleton is drawn either
   * way, but the tracker sees no frames until this turns true.
   */
  live: boolean;
  /** The set hit its target — ask the athlete how many they really did. */
  onTargetReached(): void;
}

export function useRepTracking(args: RepTrackingArgs) {
  const { videoRef, canvasRef, exercise, targetReps, isAmrap } = args;

  // Built during render, not in an effect: the HUD and the MediaPipe loop both
  // read it on the very first render, and an effect would leave it null until
  // something unrelated happened to re-render the screen.
  const tracker = useMemo(() => getTracker(exercise), [exercise]);
  const trackerRef = useRef<ExerciseTracker | null>(tracker);
  trackerRef.current = tracker;
  const poseRendererRef = useRef(createPoseRenderer());
  const [reps, setReps] = useState(0);
  // For unilateral exercises (one-arm): which arm is currently being counted.
  // "right" first, then "left"; the set advances only after both are done.
  const [side, setSide] = useState<Side>("right");
  const lastRepRef = useRef(0);

  // Always point at the current render's callbacks: onResult is memoised and
  // would otherwise close over a stale set cursor, writing actuals onto the
  // wrong set whenever consecutive sets share the same reps/weight.
  const cbRef = useRef(args);
  cbRef.current = args;

  useEffect(() => {
    setReps(0);
    lastRepRef.current = 0;
    // Unilateral exercises always start on the right arm.
    setSide("right");
    tracker?.setSide?.("right");
  }, [tracker]);

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
    if (!cbRef.current.live) return;

    const t = trackerRef.current;
    if (!t || !screenLms) {
      // A frame with no pose at all is itself a finding — the user stepped out
      // of shot, or detection dropped — so it still goes in the trace.
      if (isDebugLogging()) {
        logRecorder.recordFrame(null, null, null, lastRepRef.current, meta);
      }
      return;
    }
    const c = t.feed(screenLms, worldLms);

    // Movement trace for the Session Summary's average rep and tempo.
    const { session, workoutIdx, setIdx } = useSessionStore.getState();
    const now = performance.now();
    const angle = t.debug?.angle ?? t.angle;
    if (session && angle != null) {
      recordSample(session.sessionId, workoutIdx, setIdx, side, now, angle);
      // A threshold revision can re-count several reps at once; only a single
      // step is a rep we can place in time.
      if (c === lastRepRef.current + 1) recordRep(session.sessionId, workoutIdx, setIdx, side, now);
    }

    if (isDebugLogging()) {
      logRecorder.recordFrame(screenLms, worldLms, t.debug ?? null, c, meta);
    }

    if (c === lastRepRef.current) return;

    // Unilateral: after the right arm hits target, switch to the left and keep
    // the set open. The set only advances once both arms are done. This path
    // plays a dedicated swap cue instead of the set-complete chime.
    if (!isAmrap && c >= targetReps && t.unilateral && side === "right") {
      beepRep();        // the rep that finished the right arm still counts
      switchToLeft();   // distinct "change arms" cue
      return;
    }

    announceRep(c, targetReps, isAmrap);
    const prev = lastRepRef.current;
    lastRepRef.current = c;
    setReps(c);

    // Never end the set on the camera's word. Crossing the target opens the
    // "how many did you do?" sheet instead — once, so dismissing it and
    // carrying on past the target doesn't keep re-opening it. The short delay
    // lets the set-complete chime land first.
    if (isAmrap || prev >= targetReps || c < targetReps) return;
    setTimeout(() => cbRef.current.onTargetReached(), 600);
  }, [targetReps, isAmrap, side, switchToLeft, canvasRef, videoRef]);

  const mp = useMediapipe(videoRef, onResult, !!tracker);

  return {
    trackerRef,
    reps,
    side,
    isUnilateral: tracker?.unilateral ?? false,
    switchToLeft,
    mpReady: mp.ready,
    mpError: mp.error,
    lowPerf: mp.lowPerf,
  };
}
