// Ported from: scenes/training.py (legacy FitnessApp repo)
// Live training scene — mobile-first redesign: the camera fills the screen and
// all controls live in overlays (top bar, bottom rep bar) or on-demand sheets,
// so nothing competes with the feed the user is actually posing against.
//
// This file is the orchestration only. The per-frame work lives in
// ./training/useRepTracking, the chrome in ./training/TrainingHud, and the
// sheets in ./training/{SetSheet,MenuSheet}.

import { useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useSessionStore } from "@/stores/sessionStore";
import { QuickSettings } from "@/components/QuickSettings";
import { DebugTrace } from "@/components/DebugTrace";
import { isDebugLogging } from "@/tracking/log/flag";
import * as logRecorder from "@/tracking/log/recorder";
import { RepBar, StatusPills, TopBar } from "./training/TrainingHud";
import { SetSheet } from "./training/SetSheet";
import { MenuSheet } from "./training/MenuSheet";
import { mutateWeight, recordActuals } from "./training/session";
import { useRepTracking } from "./training/useRepTracking";
import { useSetRecorder } from "./training/useSetRecorder";

export function Training() {
  const { session, workoutIdx, setIdx, setCursor, goTo, endSession } = useSessionStore();
  const { videoRef, stream, error: camError } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<null | "menu" | "set" | "settings">(null);
  const [debugOn, setDebugOn] = useState(isDebugLogging);

  const workout = session?.workouts[workoutIdx];
  const setRow = workout?.sets[setIdx];
  const exercise = workout?.exercise ?? "";
  const targetReps = (setRow?.[0] as number) ?? 10;
  const weight = (setRow?.[1] as number) ?? 0;
  const isAmrap = Boolean(setRow?.[2]);

  const tracking = useRepTracking({
    videoRef, canvasRef, exercise, targetReps, isAmrap,
    onAutoFinish: (reps) => finishSet(reps),
    onConfirmCount: () => setSheet("set"),
  });
  const { reps, side, isUnilateral, trackerRef } = tracking;

  useSetRecorder({
    enabled: debugOn, active: !!workout, videoRef, stream, trackerRef,
    exercise, targetReps, weight, isAmrap, side, workoutIdx, setIdx,
  });

  /**
   * Record what was actually performed, then move on. `repsDone` is written
   * into the set's actuals slot so Complete.tsx (coins/history) and the
   * progression strategies score the real effort instead of assuming the
   * prescription was hit exactly.
   */
  function finishSet(repsDone: number, actualReps?: number | null) {
    if (!session || !workout) return;

    // Per-rep extremes are diagnostics only now — they go into the trace so a
    // set's achieved range can be read back, but nothing persists them.
    const cycles = trackerRef.current?.cycles ?? [];
    const restCycles = trackerRef.current?.restCycles ?? [];
    const trusted = actualReps == null || actualReps === repsDone;

    // Close the diagnostics trace first: `actualReps` is the user's own count,
    // which is what turns the frame trace into labelled data. Fire-and-forget —
    // persisting a debug log must never delay the workout.
    if (debugOn) {
      void logRecorder.endSet({
        countedReps: repsDone, actualReps,
        cycles: { extremes: cycles, restExtremes: restCycles, trusted },
      });
    }
    recordActuals(session, workoutIdx, setIdx, { reps: repsDone, weight });
    setSheet(null);

    if (setIdx + 1 < workout.sets.length) {
      setCursor(workoutIdx, setIdx + 1);
      goTo("rest");
    } else if (workoutIdx + 1 < session.workouts.length) {
      // Finished every set of this exercise — move the cursor to the next
      // exercise and show the transition screen (next-up + remaining list)
      // instead of a bare rest timer.
      setCursor(workoutIdx + 1, 0);
      goTo("transition");
    } else {
      goTo("complete");
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera fills the whole screen; the skeleton overlay uses the same
          mirror + cover transform so the dots land on the user. */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Scrim behind the top/bottom chrome so white text stays legible over
          a bright camera feed. */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

      <TopBar
        setIdx={setIdx}
        unilateral={isUnilateral}
        side={side}
        onBack={() => goTo("home")}
        onMenu={() => setSheet("menu")}
      />

      <StatusPills
        camError={camError}
        mpError={tracking.mpError}
        mpReady={tracking.mpReady}
        lowPerf={tracking.lowPerf}
        tracked={!!trackerRef.current}
      />

      <RepBar
        reps={reps}
        target={targetReps}
        amrap={isAmrap}
        pulseKey={`bar-${workoutIdx}-${setIdx}-${side}`}
        onEndSet={() => setSheet("set")}
      />

      {debugOn && (
        <DebugTrace
          trackerRef={trackerRef}
          imageRef={tracking.imageStatsRef}
          fpsRef={tracking.frameTimingRef}
          onClose={() => setDebugOn(false)}
        />
      )}

      {sheet === "set" && (
        <SetSheet
          reps={reps}
          target={targetReps}
          amrap={isAmrap}
          showSwitchArm={isUnilateral && side === "right"}
          onSwitchArm={() => { tracking.switchToLeft(); setSheet(null); }}
          onComplete={(actual) => finishSet(reps, actual)}
          onSkip={() => finishSet(0, 0)}
          onClose={() => setSheet(null)}
          askActual={debugOn}
        />
      )}

      {sheet === "menu" && (
        <MenuSheet
          exercise={exercise}
          setIdx={setIdx}
          totalSets={workout?.sets.length ?? 0}
          weight={weight}
          onWeight={(fn) => {
            if (!session) return;
            mutateWeight(session, workoutIdx, setIdx, fn);
          }}
          onEndWorkout={() => { endSession(); }}
          onSettings={() => setSheet("settings")}
          onClose={() => setSheet(null)}
        />
      )}

      {/* Settings opens over the workout rather than navigating to the
          Settings scene — leaving Training would tear down the camera and
          the rep tracker mid-set. Closing it drops straight back to the feed. */}
      {sheet === "settings" && <QuickSettings onClose={() => setSheet(null)} />}
    </div>
  );
}
