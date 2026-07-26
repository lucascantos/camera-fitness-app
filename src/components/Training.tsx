// Ported from: scenes/training.py (legacy FitnessApp repo)
// Live training scene — mobile-first redesign: the camera fills the screen and
// all controls live in overlays (top bar, bottom rep bar) or on-demand sheets,
// so nothing competes with the feed the user is actually posing against.

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { useCamera } from "@/hooks/useCamera";
import { useMediapipe } from "@/hooks/useMediapipe";
import { getTracker } from "@/tracking/exercises/registry";
import type { ExerciseTracker, Side } from "@/tracking/exercises/types";
import { createPoseRenderer } from "@/tracking/poseRenderer";
import { useSessionStore } from "@/stores/sessionStore";
import type { Session } from "@/data/plans/plans";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { say } from "@/data/trainers/say";
import type { LineCategory } from "@/data/trainers/trainer";
import { repBeep, setCompleteChime, switchSideChime } from "@/audio/sfx";
import { BackIcon } from "@/components/icons";

export function Training() {
  const { session, workoutIdx, setIdx, setCursor, goTo, endSession } = useSessionStore();
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
  const [sheet, setSheet] = useState<null | "menu" | "set">(null);
  // For unilateral exercises (one-arm): which arm is currently being counted.
  // "right" first, then "left"; the set advances only after both are done.
  const [side, setSide] = useState<Side>("right");
  const lastRepRef = useRef(0);

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
    if (c !== lastRepRef.current) {
      // Unilateral: after the right arm hits target, switch to the left and
      // keep the set open. The set only advances once both arms are done. This
      // path plays a dedicated swap cue instead of the set-complete chime.
      const sideSwitch =
        !isAmrap && c >= targetReps && t.unilateral && side === "right";
      if (sideSwitch) {
        repBeep();          // the rep that finished the right arm still counts
        switchSideChime();  // distinct "change arms" cue
        t.setSide?.("left");
        setSide("left");
        lastRepRef.current = 0;
        setReps(0);
      } else {
        onRep(c, targetReps, isAmrap);
        lastRepRef.current = c;
        setReps(c);
        if (!isAmrap && c >= targetReps && getSettings().autoRest) {
          // tiny delay so the set-complete line gets a beat to play.
          // Via ref: this callback is memoised and would otherwise close over
          // a stale finishSet (and therefore a stale setIdx) whenever
          // consecutive sets share the same reps/weight — which would write
          // the actuals onto the wrong set.
          setTimeout(() => finishSetRef.current(c), 600);
        }
      }
    }
  }, [targetReps, isAmrap, side, onRep, videoRef]);

  const { ready: mpReady, error: mpError, lowPerf } = useMediapipe(videoRef, onResult, !!trackerRef.current);

  // Record what was actually performed, then move on. `repsDone` is written
  // into the set's actuals slot so Complete.tsx (coins/history) and the
  // progression strategies score the real effort instead of assuming the
  // prescription was hit exactly.
  // Always points at the current render's finishSet — see the auto-advance
  // call in onResult above.
  const finishSetRef = useRef<(reps: number) => void>(() => {});
  finishSetRef.current = finishSet;

  function finishSet(repsDone: number) {
    if (!session || !workout) return;
    recordActuals(session, workoutIdx, setIdx, { reps: repsDone, weight });
    setSheet(null);

    const totalSets = workout.sets.length;
    const totalEx   = session.workouts.length;
    if (setIdx + 1 < totalSets) {
      setCursor(workoutIdx, setIdx + 1);
      goTo("rest");
    } else if (workoutIdx + 1 < totalEx) {
      // Finished every set of this exercise — move the cursor to the next
      // exercise and show the transition screen (next-up + remaining list)
      // instead of a bare rest timer.
      setCursor(workoutIdx + 1, 0);
      goTo("transition");
    } else {
      goTo("complete");
    }
  }

  const isUnilateral = trackerRef.current?.unilateral ?? false;

  // Manually finish the current arm and move to the other (mirrors the
  // automatic switch that fires when the right arm hits its rep target).
  function switchToOtherArm() {
    const t = trackerRef.current;
    if (!t?.unilateral) return;
    t.setSide?.("left");
    setSide("left");
    lastRepRef.current = 0;
    setReps(0);
    switchSideChime();
    setSheet(null);
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

      {/* ── Top bar: back · set counter · menu ── */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <RoundButton onClick={() => goTo("home")} label="Back to menu">
          <BackIcon size={20} />
        </RoundButton>
        <div className="text-white font-bold text-lg drop-shadow">
          Set {setIdx + 1}
          {isUnilateral && (
            <span className="font-semibold opacity-80">
              {side === "right" ? " · Right" : " · Left"}
            </span>
          )}
        </div>
        <RoundButton onClick={() => setSheet("menu")} label="Workout controls">
          <MenuIcon />
        </RoundButton>
      </div>

      {/* Status pills — only for states the user must act on. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
        style={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}
      >
        {camError && (
          <Pill tone="error">Camera error: {camError}</Pill>
        )}
        {mpError && <Pill tone="error">Pose model error: {mpError}</Pill>}
        {trackerRef.current && !mpReady && !mpError && (
          <Pill tone="neutral">Loading pose model…</Pill>
        )}
        {lowPerf && mpReady && (
          <Pill tone="warn">Low performance — reduced tracking quality</Pill>
        )}
        {!trackerRef.current && (
          <Pill tone="neutral">Manual mode — tap the counter when done</Pill>
        )}
      </div>

      {/* ── Bottom rep bar — tap to end the set ── */}
      <button
        onClick={() => setSheet("set")}
        className="absolute inset-x-0 bottom-0 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        aria-label="End this set"
      >
        <div className="bg-accent rounded-full px-5 py-3 flex items-center gap-3 shadow-lg">
          <div className="text-on_accent font-extrabold text-2xl leading-none shrink-0">
            {reps}
            <span className="text-base font-bold opacity-80">
              {isAmrap ? "+" : `/${targetReps}`}
            </span>
          </div>
          <RepSegments done={reps} target={targetReps} amrap={isAmrap} />
        </div>
      </button>

      {sheet === "set" && (
        <SetSheet
          reps={reps}
          target={targetReps}
          amrap={isAmrap}
          showSwitchArm={isUnilateral && side === "right"}
          onSwitchArm={switchToOtherArm}
          onComplete={() => finishSet(reps)}
          onSkip={() => finishSet(0)}
          onClose={() => setSheet(null)}
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
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// ── Bottom rep bar pieces ────────────────────────────────────────────────────

function RepSegments({ done, target, amrap }: {
  done: number; target: number; amrap: boolean;
}) {
  // AMRAP has no ceiling, so the bar cycles every 10 reps rather than trying
  // to render an unbounded number of segments.
  const count = amrap ? 10 : target;
  const filled = amrap ? done % 10 : done;
  return (
    <div className="flex gap-1.5 flex-1 min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            "flex-1 h-4 rounded-full min-w-0 " +
            (i < filled ? "bg-on_accent" : "bg-white/30")
          }
        />
      ))}
    </div>
  );
}

// ── Overlays ─────────────────────────────────────────────────────────────────

function SetSheet({ reps, target, amrap, showSwitchArm, onSwitchArm, onComplete, onSkip, onClose }: {
  reps: number; target: number; amrap: boolean;
  showSwitchArm: boolean; onSwitchArm(): void;
  onComplete(): void; onSkip(): void; onClose(): void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <div
        className="bg-panel rounded-3xl p-6 w-full max-w-sm shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-xl font-extrabold text-ink">End this set?</div>
          <div className="text-gray-dark mt-1">
            {reps} {amrap ? "reps done" : `of ${target} reps done`}
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {showSwitchArm && (
            <button
              onClick={onSwitchArm}
              className="w-full py-3.5 rounded-2xl font-bold bg-good text-on_accent"
            >
              ⇄ Switch arm
            </button>
          )}
          <button
            onClick={onComplete}
            className="w-full py-3.5 rounded-2xl font-bold bg-nav text-white"
          >
            ✓ Complete Set
          </button>
          {/* Skip records the set as 0 reps, so progression scores it as a
              miss rather than silently crediting the full prescription. */}
          <button
            onClick={onSkip}
            className="w-full py-3.5 rounded-2xl font-bold bg-panel text-gray-dark border border-border"
          >
            Skip Set
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

function MenuSheet({ exercise, setIdx, totalSets, weight, onWeight, onEndWorkout, onClose }: {
  exercise: string; setIdx: number; totalSets: number; weight: number;
  onWeight(fn: (v: number) => number): void;
  onEndWorkout(): void; onClose(): void;
}) {
  const [, force] = useState({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const step = getSettings().weightStep;

  return (
    <Backdrop onClose={onClose} align="bottom">
      <div
        className="bg-panel rounded-t-3xl p-5 w-full max-w-lg"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-ink truncate">
            {titleCase(exercise)}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-panel-dark text-gray-dark grid place-items-center shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 bg-panel-dark rounded-2xl p-3">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            SET {setIdx + 1} OF {totalSets}
          </div>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div
                key={i}
                className={
                  "flex-1 h-9 rounded-lg grid place-items-center font-bold text-sm " +
                  (i === setIdx ? "bg-accent text-on_accent"
                    : i < setIdx ? "bg-good text-on_accent"
                    : "bg-panel text-gray-dark")
                }
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <Stepper
          label="WEIGHT"
          value={weight === 0 ? "bodyweight" : String(weight)}
          suffix={weight === 0 ? "" : "kg"}
          onMinus={() => { onWeight((v) => Math.max(0, v - step)); force({}); }}
          onPlus={() => { onWeight((v) => Math.min(500, v + step)); force({}); }}
        />
        <Stepper
          label="REST"
          value={String(getSettings().restSeconds)}
          suffix="s"
          onMinus={async () => {
            await updateSettings({ restSeconds: Math.max(5, getSettings().restSeconds - 15) });
            force({});
          }}
          onPlus={async () => {
            await updateSettings({ restSeconds: Math.min(600, getSettings().restSeconds + 15) });
            force({});
          }}
        />

        {confirmEnd ? (
          <div className="mt-4 rounded-2xl border border-accent bg-accent/10 p-3">
            <div className="text-sm font-bold text-ink">
              End the workout? Unfinished sets won’t be recorded.
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onEndWorkout}
                className="flex-1 py-3 rounded-2xl font-bold bg-accent text-on_accent"
              >
                End workout
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 py-3 rounded-2xl font-bold bg-panel text-gray-dark border border-border"
              >
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="mt-4 w-full py-3 rounded-2xl font-bold text-accent border border-border"
          >
            End workout
          </button>
        )}
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose, align = "center" }: {
  children: React.ReactNode; onClose(): void; align?: "center" | "bottom";
}) {
  return (
    <div
      onClick={onClose}
      className={
        "fixed inset-0 z-50 bg-black/50 flex justify-center " +
        (align === "bottom" ? "items-end" : "items-center p-4")
      }
    >
      {children}
    </div>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────

function RoundButton({ children, onClick, label }: {
  children: React.ReactNode; onClick(): void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-black/35 backdrop-blur text-white grid place-items-center shrink-0"
    >
      {children}
    </button>
  );
}

function Pill({ children, tone }: {
  children: React.ReactNode; tone: "error" | "warn" | "neutral";
}) {
  const cls =
    tone === "error" ? "bg-red-600/85 text-white" :
    tone === "warn"  ? "bg-coin/90 text-white" :
                       "bg-black/55 text-white";
  return (
    <div className={"px-3 py-1 rounded-full text-xs font-semibold text-center " + cls}>
      {children}
    </div>
  );
}

function Stepper({ label, value, suffix, onMinus, onPlus }: {
  label: string; value: string; suffix: string; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="mt-3 bg-panel-dark rounded-2xl p-3 flex items-center">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">{label}</div>
        <div className="text-xl font-extrabold text-ink mt-0.5 truncate">
          {value}
          {suffix && <span className="text-sm font-normal text-gray-dark"> {suffix}</span>}
        </div>
      </div>
      <button
        onClick={onMinus}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full bg-panel text-ink text-2xl grid place-items-center shrink-0"
      >
        −
      </button>
      <button
        onClick={onPlus}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full bg-good text-on_accent text-2xl ml-2 grid place-items-center shrink-0"
      >
        +
      </button>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// ── Session mutation ─────────────────────────────────────────────────────────

/** Store what the athlete actually did for this set (reps + working weight). */
function recordActuals(
  session: Session, wi: number, si: number,
  actuals: { reps: number; weight: number },
) {
  session.workouts[wi].sets[si][3] = actuals;
  useSessionStore.setState({ session: { ...session } });
}

function mutateWeight(
  session: Session, wi: number, si: number, fn: (v: number) => number,
) {
  const sets = session.workouts[wi].sets;
  const prev = sets[si][1];
  const next = fn(prev);
  sets[si][1] = next;
  // Weight changes carry forward to later sets that shared this set's previous
  // load, so dialing in the weight on set 1 of a same-weight scheme (e.g. a
  // linear 3×10 that started at bodyweight) applies to every following set
  // instead of leaving them at the old value. Sets that intentionally differ
  // (5/3/1's 65/75/85 %, BBB back-off sets) keep their own weights.
  for (let i = si + 1; i < sets.length; i++) {
    if (sets[i][1] === prev) sets[i][1] = next;
  }
  useSessionStore.setState({ session: { ...session } });
}

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }
