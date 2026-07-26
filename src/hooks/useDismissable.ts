import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lets an overlay play an exit animation before it unmounts.
 *
 * React removes a conditionally-rendered overlay the instant its flag flips,
 * so without this the enter animation is visible but the exit never is. Call
 * `dismiss()` from close buttons/backdrops: it flips `closing` (so the caller
 * can swap in the outgoing animation class) and only then invokes `onClose`.
 *
 * `durationMs` must match the exit animation. Under
 * `prefers-reduced-motion` the CSS collapses animations to ~0ms but this
 * timer still runs, so keep it short enough not to feel like a hang.
 */
export function useDismissable(onClose: () => void, durationMs = 200) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Keep the latest onClose without restarting an in-flight dismissal.
  const cbRef = useRef(onClose);
  useEffect(() => { cbRef.current = onClose; }, [onClose]);

  const dismiss = useCallback(() => {
    // Guard against a second tap (backdrop + button) queueing two closes.
    if (timerRef.current != null) return;
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      cbRef.current();
    }, durationMs);
  }, [durationMs]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  return { closing, dismiss };
}
