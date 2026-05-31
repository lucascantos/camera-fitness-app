// Ported from: scenes/training.py (legacy FitnessApp repo)
// Live training scene: camera + rep counter + reps/weight/rest controls.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { useCamera } from "@/hooks/useCamera";
import { useMediapipe } from "@/hooks/useMediapipe";
import { getTracker } from "@/tracking/exercises/registry";
import type { ExerciseTracker } from "@/tracking/exercises/types";
import { createPoseRenderer } from "@/tracking/poseRenderer";
import { useSessionStore } from "@/stores/sessionStore";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { say } from "@/data/trainers/say";
import type { LineCategory } from "@/data/trainers/trainer";
import { repBeep, setCompleteChime } from "@/audio/sfx";
import { useTrainerStore } from "@/stores/trainerStore";
import { BackIcon } from "@/components/icons";

// Joint label per exercise — drives the status-bar sub line.
const JOINT_BY_EXERCISE: Record<string, string> = {
  "bicep curl":     "Elbow",
  "push ups":       "Elbow",
  "bench press":    "Elbow",
  "overhead press": "Elbow",
  "barbell row":    "Elbow",
  "squat":          "Knee",
  "deadlift":       "Hip",
  "lateral raise":  "Shoulder",
};

// How long a trainer line lives in the status bar before the fallback
// (exercise name) reappears.
const TRAINER_LINE_TTL_MS = 4000;

export function Training() {
  const { session, workoutIdx, setIdx, setCursor, goTo } = useSessionStore();
  const { videoRef, error: camError } = useCamera();

  const workout = session?.workouts[workoutIdx];
  const setRow  = workout?.sets[setIdx];
  const exercise = workout?.exercise ?? "";
  const targetReps = (setRow?.[0] as number) ?? 10;
  const weight     = (setRow?.[1] as number) ?? 0;
  const isAmrap    = Boolean(setRow?.[2]);

  // Tracker — re-create on exercise change.
  const trackerRef = useRef<ExerciseTracker | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const poseRendererRef = useRef(createPoseRenderer());
  const [reps, setReps] = useState(0);
  const [angle, setAngle] = useState<number | null>(null);
  const lastRepRef = useRef(0);
  const lastAngleTsRef = useRef(0);

  // Live trainer line — fades back to the exercise name after TTL.
  const trainerText = useTrainerStore((s) => s.text);
  const trainerTick = useTrainerStore((s) => s.tick);
  const [statusLine, setStatusLine] = useState<string>("");
  useEffect(() => {
    if (!trainerText || !getSettings().trainerEnabled) return;
    setStatusLine(trainerText);
    const id = setTimeout(() => setStatusLine(""), TRAINER_LINE_TTL_MS);
    return () => clearTimeout(id);
  }, [trainerTick, trainerText]);

  useEffect(() => {
    trackerRef.current = getTracker(exercise);
    setReps(0);
    lastRepRef.current = 0;
    say("intro", exercise);
  }, [exercise]);

  // Voice-line + SFX trigger on rep changes.
  const onRep = useCallback((r: number, target: number, amrap: boolean) => {
    if (r <= 0) return;

    // SFX: short beep on every counted rep, ascending chime when the
    // set finishes (non-AMRAP only).
    repBeep();

    let cat: LineCategory | null = null;
    if (!amrap && r === target) {
      cat = "set_complete";
      setCompleteChime();
    }
    else if (!amrap && target >= 2 && r === target-1) cat = "milestone_last1";
    else if (!amrap && target >= 5 && r === target-3) cat = "milestone_last3";
    else if (!amrap && target >= 4 && r === Math.ceil(target/2)) cat = "milestone_half";
    else if (amrap && r % 5 === 0)                    cat = "rep";
    else if (!amrap && r % 3 === 0)                   cat = "rep";
    if (cat) say(cat);
  }, []);

  // MediaPipe — fires once per frame with landmarks.
  const onResult = useCallback((res: PoseLandmarkerResult) => {
    const screenLms = res.landmarks?.[0];
    const worldLms  = res.worldLandmarks?.[0] ?? null;

    // ── Skeleton overlay ──
    // The canvas bitmap is sized to match its CSS box (not the video's
    // native resolution).  We compute the same cover-crop transform the
    // <video> element applies via object-fit:cover and map the normalised
    // landmarks into canvas-pixel space so the dots sit on the user.
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (canvas && video && screenLms) {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width  = cw;
        canvas.height = ch;
      }

      const vw = video.videoWidth  || cw;
      const vh = video.videoHeight || ch;
      const s  = Math.max(cw / vw, ch / vh);          // cover scale
      const ox = (cw - vw * s) / 2;                    // horizontal offset (negative = cropped)
      const oy = (ch - vh * s) / 2;                    // vertical   offset

      const mapped = screenLms.map((lm) => ({
        ...lm,
        x: (lm.x * vw * s + ox) / cw,
        y: (lm.y * vh * s + oy) / ch,
      }));

      const ctx = canvas.getContext("2d");
      if (ctx) poseRendererRef.current.draw(ctx, mapped, cw, ch, getSettings().poseStyle);
    } else if (canvas && !screenLms) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    // ── Rep counter ──
    const t = trackerRef.current;
    if (!t || !screenLms) return;
    const c = t.feed(screenLms, worldLms);
    // Throttle angle state updates to ~10fps — the overlay is drawn directly
    // on the canvas, so this only governs the status-bar number and keeps
    // per-frame React re-renders from competing with inference.
    const nowMs = performance.now();
    if (nowMs - lastAngleTsRef.current > 100) {
      lastAngleTsRef.current = nowMs;
      setAngle(t.angle);
    }
    if (c !== lastRepRef.current) {
      onRep(c, targetReps, isAmrap);
      lastRepRef.current = c;
      setReps(c);
      if (!isAmrap && c >= targetReps && getSettings().autoRest) {
        // tiny delay so the set-complete line gets a beat to play
        setTimeout(() => advance(), 600);
      }
    }
  }, [targetReps, isAmrap, onRep, videoRef]);

  const { ready: mpReady, error: mpError } = useMediapipe(videoRef, onResult, !!trackerRef.current);

  function advance() {
    if (!session || !workout) return;
    const totalSets = workout.sets.length;
    const totalEx   = session.workouts.length;
    if (setIdx + 1 < totalSets) {
      setCursor(workoutIdx, setIdx + 1);
      goTo("rest");
    } else if (workoutIdx + 1 < totalEx) {
      setCursor(workoutIdx + 1, 0);
      goTo("rest");
    } else {
      goTo("complete");
    }
  }

  const display = trackerRef.current ? reps : targetReps;

  return (
    <div className="grid grid-cols-[1fr_460px] gap-4 p-4 h-full">
      {/* Camera card */}
      <div className="bg-panel-dark rounded-3xl p-4 flex flex-col">
        <div className="flex-1 bg-panel rounded-2xl overflow-hidden relative">
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Pose skeleton overlay — same mirror + object-cover as the
              video so the dots sit on the user even when the container's
              aspect ratio differs from the camera's. pointer-events none
              so clicks fall through. */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />
          {camError && (
            <div className="absolute inset-0 grid place-items-center text-red-300">
              Camera error: {camError}
            </div>
          )}
          {mpError && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-red-600/80 rounded-full text-sm text-white">
              Pose model error: {mpError}
            </div>
          )}
          {trackerRef.current && !mpReady && !mpError && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-bg/80 rounded-full text-sm">
              Loading pose model…
            </div>
          )}
          {!trackerRef.current && (
            <div className="absolute bottom-3 left-3 px-3 py-1 bg-bg/80 rounded-full text-sm">
              Manual mode — tap Set complete when done
            </div>
          )}
        </div>
        {/* Status bar — trainer's current line in bold, joint feedback
            underneath, angle pill on the right. Matches the legacy
            white-pill toast pattern. */}
        <div className="mt-3 bg-panel rounded-2xl p-3 flex items-center gap-3 shadow-card border border-border">
          <div className="w-10 h-10 rounded-full bg-good grid place-items-center text-white text-lg shrink-0">
            ↻
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink truncate">
              {statusLine || titleCase(exercise)}
            </div>
            <div className="text-sm text-gray-dark truncate">
              {angle != null
                ? `${JOINT_BY_EXERCISE[exercise] ?? "Joint"} at ${Math.round(angle)}° — keep it tight`
                : trackerRef.current
                  ? "Move into frame so I can see you"
                  : "Manual mode — tap Set complete when done"}
            </div>
          </div>
          {angle != null && (
            <div className="px-3 py-1 rounded-full bg-coin text-white font-bold shrink-0">
              {Math.round(angle)}°
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-3">
        {/* Header: back + exercise title + settings gear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => goTo("home")}
              className="w-10 h-10 rounded-xl bg-panel border border-border grid place-items-center text-gray-dark hover:bg-panel-dark transition shrink-0"
              title="Back to menu"
            >
              <BackIcon size={20} />
            </button>
            <div className="text-lg font-bold truncate">{titleCase(exercise)}</div>
          </div>
          <button
            onClick={() => goTo("settings")}
            className="w-10 h-10 rounded-xl bg-panel border border-border grid place-items-center text-gray-dark hover:bg-panel-dark transition"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>

        {/* Reps */}
        <div className="bg-accent rounded-3xl p-5 text-on_accent">
          <div className="text-xs font-bold tracking-widest opacity-80">
            {isAmrap ? "AMRAP · REPS DONE" : "REPS DONE"}
          </div>
          <div className="flex items-baseline">
            <div className="text-6xl font-extrabold">{display}</div>
            <div className="text-2xl font-bold ml-2">
              {isAmrap ? "+" : `/${targetReps}`}
            </div>
          </div>
          <ProgressBar value={display} target={targetReps} amrap={isAmrap} />
        </div>

        {/* Set chips */}
        <div className="bg-panel rounded-2xl p-4 border border-border">
          <div className="text-xs font-bold tracking-widest text-gray-dark mb-2">
            SET {setIdx + 1} OF {workout?.sets.length ?? 0}
          </div>
          <div className="flex gap-2">
            {workout?.sets.map((s, i) => {
              const amrap = Boolean(s[2]);
              const cls =
                i === setIdx ? "bg-accent text-on_accent" :
                i <  setIdx ? "bg-good   text-on_accent" :
                              "bg-panel-dark text-gray-dark";
              return (
                <div key={i} className={`flex-1 h-10 rounded-lg grid place-items-center font-bold ${cls}`}>
                  {amrap ? "A" : i + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weight */}
        <Stepper
          label="WEIGHT"
          suffix={weight === 0 ? "" : "kg"}
          value={weight === 0 ? "bodyweight" : String(weight)}
          onMinus={() => mutateSet(session, workoutIdx, setIdx, 1, (v) => Math.max(0, +v - getSettings().weightStep))}
          onPlus ={() => mutateSet(session, workoutIdx, setIdx, 1, (v) => Math.min(500, +v + getSettings().weightStep))}
        />

        {/* Rest */}
        <Stepper
          label="REST"
          suffix="s"
          value={String(getSettings().restSeconds)}
          onMinus={() => updateSettings({ restSeconds: Math.max(5,   getSettings().restSeconds - 15) })}
          onPlus ={() => updateSettings({ restSeconds: Math.min(600, getSettings().restSeconds + 15) })}
        />

        {/* Done button — dark ink fill with white text, matching legacy */}
        <button
          onClick={advance}
          className="mt-auto bg-nav text-white font-bold py-4 rounded-2xl text-lg hover:bg-ink transition flex items-center justify-center gap-3"
        >
          <span className="text-xl">✓</span> Set complete!
        </button>
      </div>

    </div>
  );
}

function ProgressBar({ value, target, amrap }: { value: number; target: number; amrap: boolean }) {
  if (amrap) {
    const pct = ((value % 10) / 10) * 100;
    return (
      <div className="h-1.5 bg-white/30 rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-on_accent rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return (
    <div className="flex gap-1 mt-3">
      {Array.from({ length: target }).map((_, i) => (
        <div key={i}
          className={`flex-1 h-1.5 rounded-full ${i < value ? "bg-on_accent" : "bg-white/30"}`} />
      ))}
    </div>
  );
}

function Stepper({ label, value, suffix, onMinus, onPlus }: {
  label: string; value: string; suffix: string; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="bg-panel rounded-2xl p-3 border border-border flex items-center">
      <div className="flex-1">
        <div className="text-xs font-bold tracking-widest text-gray-dark">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}{suffix && <span className="text-sm font-normal text-gray-dark"> {suffix}</span>}</div>
      </div>
      <button onClick={onMinus} className="w-10 h-10 rounded-xl bg-panel-dark hover:bg-bg text-2xl">−</button>
      <button onClick={onPlus}  className="w-10 h-10 rounded-xl bg-good ml-2 text-on_accent text-2xl">+</button>
    </div>
  );
}

function mutateSet(
  session: ReturnType<typeof useSessionStore.getState>["session"],
  wi: number, si: number, col: 0 | 1, fn: (v: number | boolean) => number,
) {
  if (!session) return;
  const s = session.workouts[wi].sets[si];
  s[col] = fn(s[col] as number) as never;
  // Force a re-render via store mutation.
  useSessionStore.setState({ session: { ...session } });
}

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }
