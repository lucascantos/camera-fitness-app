// Live tracking diagnostics overlay (dev-only).
//
// Reading a trace back after the fact tells you what happened; watching this
// while you do the reps tells you *why*. The strip plots the tracked joint
// angle against the tracker's own work/rest threshold bands, so a rep that
// doesn't count is immediately legible as one of: the angle never reached the
// band, the posture gate froze the machine, the landmark was low-visibility, or
// the frame rate collapsed and the confirm window ate the transition.
//
// Runs its own rAF loop and draws to a canvas rather than re-rendering React
// per frame — the inference loop already owns the frame budget and a 30Hz React
// tree update would compete with it.

import { useEffect, useRef, useState } from "react";
import type { ExerciseTracker } from "@/tracking/exercises/types";
import type { ImageStats } from "@/tracking/log/types";
import { getLiveStats, markEvent } from "@/tracking/log/recorder";

const HISTORY = 240;          // ~8s of trace at 30fps
const ANGLE_MIN = 0;
const ANGLE_MAX = 180;

export interface DebugTraceProps {
  trackerRef: React.MutableRefObject<ExerciseTracker | null>;
  /** Latest per-frame image stats, kept in a ref by Training. */
  imageRef: React.MutableRefObject<ImageStats | null>;
  /** Latest frame timing, kept in a ref by Training. */
  fpsRef: React.MutableRefObject<{ fps: number; dtMs: number; skip: number }>;
  onClose(): void;
}

export function DebugTrace({ trackerRef, imageRef, fpsRef, onClose }: DebugTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angles = useRef<(number | null)[]>([]);
  const reasons = useRef<string[]>([]);
  const [readout, setReadout] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastText = 0;

    const tick = () => {
      const t = trackerRef.current;
      const d = t?.debug ?? null;

      angles.current.push(d?.angle ?? null);
      reasons.current.push(d?.reason ?? "");
      if (angles.current.length > HISTORY) {
        angles.current.shift();
        reasons.current.shift();
      }

      draw(canvasRef.current, angles.current, reasons.current, t?.bands ?? null);

      // Text at ~5Hz: enough to read, cheap enough not to matter.
      const now = performance.now();
      if (now - lastText > 200) {
        lastText = now;
        const img = imageRef.current;
        const f = fpsRef.current;
        const live = getLiveStats();
        setReadout([
          `angle ${fmt(d?.angle)}°   alt ${fmt(d?.angleOther)}°   ${d?.usedWorld ? "world" : "screen"}`,
          `state ${d?.state ?? "-"} → ${d?.target ?? "-"}   confirm ${d?.confirm ?? 0}/${d?.confirmFrames ?? 0}`,
          `why ${d?.reason ?? "-"}${d?.formError ? `   form: ${d.formError}` : ""}`,
          `vis ${fmt(d?.minVisibility, 2)}   fps ${f.fps.toFixed(0)}   dt ${f.dtMs.toFixed(0)}ms   skip ${f.skip}`,
          img
            ? `luma ${img.luma.toFixed(2)}  contrast ${img.contrast.toFixed(2)}  motion ${img.motion.toFixed(3)}  clip ▼${pct(img.clipLow)} ▲${pct(img.clipHigh)}`
            : "image stats off",
          live.recording
            ? `rec ${live.frames} frames${live.droppedFrames ? ` (+${live.droppedFrames} dropped)` : ""}`
            : "not recording",
          d?.aux ? Object.entries(d.aux).map(([k, v]) => `${k} ${v.toFixed(0)}°`).join("   ") : "",
        ].filter(Boolean));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trackerRef, imageRef, fpsRef]);

  return (
    <div className="absolute left-2 right-2 z-40 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top) + 7.5rem)" }}>
      <div className="bg-black/75 backdrop-blur rounded-xl overflow-hidden pointer-events-auto max-w-md">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10">
          <span className="text-[10px] font-bold tracking-widest text-white/70">
            TRACKING DEBUG
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-white/70 text-xs px-2 py-0.5 rounded bg-white/10"
          >
            {collapsed ? "show" : "hide"}
          </button>
          <button
            onClick={onClose}
            aria-label="Close debug overlay"
            className="text-white/70 text-xs px-2 py-0.5 rounded bg-white/10"
          >
            ✕
          </button>
        </div>

        {!collapsed && (
          <>
            <canvas
              ref={canvasRef}
              width={HISTORY}
              height={90}
              className="w-full block"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="px-3 py-2 font-mono text-[10px] leading-relaxed text-white/85">
              {readout.map((line, i) => (
                <div key={i} className="truncate">{line}</div>
              ))}
            </div>
            {/* Ground truth. These are the labels that make a trace worth
                keeping — without them a trace is just numbers with no answer. */}
            <div className="flex gap-1.5 px-3 pb-2">
              <button
                onClick={() => markEvent("missed-rep")}
                className="flex-1 py-2 rounded-lg bg-good/80 text-white text-xs font-bold"
              >
                Missed a rep
              </button>
              <button
                onClick={() => markEvent("false-rep")}
                className="flex-1 py-2 rounded-lg bg-red-600/80 text-white text-xs font-bold"
              >
                Counted wrongly
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function draw(
  canvas: HTMLCanvasElement | null,
  angles: (number | null)[],
  reasons: string[],
  bands: { work: number; rest: number; inverted: boolean } | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  const y = (deg: number) => h - ((deg - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)) * h;

  if (bands) {
    // Shade the two zones the state machine switches between. For an inverted
    // tracker (lateral raise, overhead press) the work zone is the high angles.
    const workTop = bands.inverted ? y(ANGLE_MAX) : y(bands.work);
    const workBot = bands.inverted ? y(bands.work) : y(ANGLE_MIN);
    ctx.fillStyle = "rgba(255,120,60,0.16)";
    ctx.fillRect(0, workTop, w, workBot - workTop);

    const restTop = bands.inverted ? y(bands.rest) : y(ANGLE_MAX);
    const restBot = bands.inverted ? y(ANGLE_MIN) : y(bands.rest);
    ctx.fillStyle = "rgba(60,200,255,0.16)";
    ctx.fillRect(0, restTop, w, restBot - restTop);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (const deg of [bands.work, bands.rest]) {
      ctx.beginPath();
      ctx.moveTo(0, y(deg) + 0.5);
      ctx.lineTo(w, y(deg) + 0.5);
      ctx.stroke();
    }
  }

  // Frames where the machine was frozen or blind get a vertical tick, so a
  // flat stretch of trace is attributable rather than mysterious.
  for (let i = 0; i < reasons.length; i++) {
    const r = reasons[i];
    if (r === "posture-gate") ctx.fillStyle = "rgba(255,90,90,0.5)";
    else if (r === "missing-landmark" || r === "non-finite-angle") ctx.fillStyle = "rgba(255,220,0,0.5)";
    else if (r === "counted") ctx.fillStyle = "rgba(120,255,140,0.95)";
    else continue;
    ctx.fillRect(i, 0, r === "counted" ? 2 : 1, h);
  }

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    if (a == null) { pen = false; continue; }
    const py = y(a);
    if (!pen) { ctx.moveTo(i, py); pen = true; }
    else ctx.lineTo(i, py);
  }
  ctx.stroke();
}

function fmt(v: number | null | undefined, digits = 0): string {
  return v == null ? "–" : v.toFixed(digits);
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
