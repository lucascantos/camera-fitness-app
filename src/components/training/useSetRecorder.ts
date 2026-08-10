// Wires the training screen to the diagnostics recorder (src/tracking/log/).
// Off by default — when `enabled` is false this hook registers nothing beyond
// the teardown that releases the orientation listener.

import { useEffect } from "react";
import type { ExerciseTracker, Side } from "@/tracking/exercises/types";
import { openingThresholds } from "@/tracking/exercises/registry";
import { POSE_MODEL_URL } from "@/hooks/useMediapipe";
import * as logRecorder from "@/tracking/log/recorder";

export interface SetRecorderArgs {
  enabled: boolean;
  active: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  trackerRef: React.MutableRefObject<ExerciseTracker | null>;
  exercise: string;
  targetReps: number;
  weight: number;
  isAmrap: boolean;
  side: Side;
  workoutIdx: number;
  setIdx: number;
}

/**
 * Opens a fresh recording per set. Keyed on the set cursor and the active
 * side, since a unilateral side switch restarts the count and so should be a
 * separate trace. An abandoned set (navigating away) is simply dropped.
 */
export function useSetRecorder(a: SetRecorderArgs): void {
  const {
    enabled, active, videoRef, stream, trackerRef,
    exercise, targetReps, weight, isAmrap, side, workoutIdx, setIdx,
  } = a;

  useEffect(() => {
    if (!enabled || !active) return;
    logRecorder.beginSet({
      video: videoRef.current,
      stream,
      exercise,
      targetReps,
      weight,
      isAmrap,
      side: trackerRef.current?.unilateral ? side : null,
      unilateral: trackerRef.current?.unilateral ?? false,
      workoutIdx,
      setIdx,
      poseModel: POSE_MODEL_URL,
      // Without this a trace can't be read back: the same angles mean
      // different things under different thresholds. These are the *opening*
      // values only — the tracker adapts away from them during the set.
      calibration: openingThresholds(exercise),
    });
    return () => { logRecorder.abortSet(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, active, exercise, workoutIdx, setIdx, side, stream]);

  useEffect(() => () => logRecorder.teardown(), []);
}
