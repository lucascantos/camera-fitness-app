// The live angle graph shown on every set: the tracked joint angle over the
// last few seconds, drawn against the tracker's own work/rest bands, with a
// green tick on each counted rep. Watching it while you move tells you how
// deep each rep went and why one didn't count.
//
// Runs its own rAF loop and draws to a canvas rather than re-rendering React
// per frame — the inference loop already owns the frame budget.

import { useEffect, useRef } from "react";
import type { ExerciseTracker } from "@/tracking/exercises/types";
import { drawTrace } from "./traceCanvas";

/** Samples kept on screen: ~8s at the 30Hz sampling rate below. */
const HISTORY = 240;
/** Sample at pose-model rate, not display rate, so 120Hz screens don't halve the window. */
const SAMPLE_MS = 33;

export function LiveGraph({ trackerRef }: {
  trackerRef: React.MutableRefObject<ExerciseTracker | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const angles: (number | null)[] = [];
    const reasons: string[] = [];
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < SAMPLE_MS) return;
      last = now;

      const t = trackerRef.current;
      const d = t?.debug ?? null;
      angles.push(d?.angle ?? null);
      reasons.push(d?.reason ?? "");
      if (angles.length > HISTORY) {
        angles.shift();
        reasons.shift();
      }

      const c = canvasRef.current;
      if (!c) return;
      // Match the backing store to the displayed size so the line stays crisp.
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      drawTrace(c, angles, reasons, t?.bands ?? null, HISTORY);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trackerRef]);

  return (
    <div
      className="absolute inset-x-4 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)" }}
    >
      <div className="bg-black/45 backdrop-blur rounded-2xl overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-20 block" />
      </div>
    </div>
  );
}
