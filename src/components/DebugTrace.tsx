// Live tracking diagnostics overlay (dev-only).
//
// The angle graph itself is always on (training/LiveGraph). This panel adds
// the numbers behind it — state, confirm window, visibility, frame rate, image
// stats — so a rep that doesn't count is legible as one of: the angle never
// reached the band, the posture gate froze the machine, the landmark was
// low-visibility, or the frame rate collapsed and the confirm window ate the
// transition. Plus the ground-truth buttons that label a recorded trace.
//
// Text refreshes at ~5Hz from a rAF loop rather than per pose frame.

import { useEffect, useState } from "react";
import type { ExerciseTracker } from "@/tracking/exercises/types";
import type { ImageStats } from "@/tracking/log/types";
import { getLiveStats, getRepTapCount, markEvent, markRepTap } from "@/tracking/log/recorder";
import { getDebugOptions } from "@/tracking/log/flag";

export interface DebugTraceProps {
  trackerRef: React.MutableRefObject<ExerciseTracker | null>;
  /** Latest per-frame image stats, kept in a ref by Training. */
  imageRef: React.MutableRefObject<ImageStats | null>;
  /** Latest frame timing, kept in a ref by Training. */
  fpsRef: React.MutableRefObject<{ fps: number; dtMs: number; skip: number }>;
  onClose(): void;
}

export function DebugTrace({ trackerRef, imageRef, fpsRef, onClose }: DebugTraceProps) {
  const [taps, setTaps] = useState(getRepTapCount);
  const repTapOn = getDebugOptions().repTap;
  const [readout, setReadout] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastText = 0;

    const tick = () => {
      const d = trackerRef.current?.debug ?? null;

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
    <>
    {/* Rep-tap target. A net miscount says six reps were missed; tapping says
        which six, which is what lets a failure be aligned to a moment in the
        trace. Deliberately huge — this gets hit mid-set, often from the floor. */}
    {repTapOn && (
      <button
        onClick={() => setTaps(markRepTap())}
        aria-label="Tap once per rep you actually performed"
        className="absolute inset-x-0 top-1/3 bottom-24 z-30 bg-white/5 active:bg-white/25 transition-colors flex items-end justify-center pb-4"
      >
        <span className="text-white/70 text-sm font-bold tracking-widest drop-shadow">
          TAP EACH REP · {taps}
        </span>
      </button>
    )}

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
    </>
  );
}

function fmt(v: number | null | undefined, digits = 0): string {
  return v == null ? "–" : v.toFixed(digits);
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
