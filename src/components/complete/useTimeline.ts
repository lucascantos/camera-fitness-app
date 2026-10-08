// A reveal sequence driven by timers: `stage` climbs from 0 to delays.length,
// waiting delays[i] ms before leaving stage i. `skip()` jumps straight to the
// end and flags it, so the UI can render final values without animating.

import { useCallback, useEffect, useRef, useState } from "react";

export function useTimeline(delays: number[]) {
  const [stage, setStage] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const last = delays.length;

  useEffect(() => {
    if (skipped || stage >= last) return;
    const id = setTimeout(() => setStage((s) => s + 1), delays[stage]);
    return () => clearTimeout(id);
    // `delays` is rebuilt every render by the caller; its length is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, skipped, last]);

  const skip = useCallback(() => {
    setSkipped(true);
    setStage(last);
  }, [last]);

  return { stage, skipped, done: stage >= last, skip };
}

/**
 * Counts from 0 up to `target` over `ms` with an ease-out, once `run` turns
 * true. With `instant` it shows the target straight away (the skipped path).
 */
export function useCountUp(target: number, run: boolean, instant: boolean, ms = 900): number {
  const [value, setValue] = useState(instant ? target : 0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) { setValue(target); return; }
    if (!run) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, instant, ms]);

  return value;
}
