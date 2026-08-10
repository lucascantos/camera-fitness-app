// Types a string out character by character, with a skip.
//
// Used by the consultation (src/components/Coach.tsx) to give the coach's
// lines a spoken pace instead of dumping a paragraph. Tapping mid-line skips
// to the end — the standard visual-novel contract, and the thing that stops
// the effect from feeling like a delay on a re-read.
//
// Honours prefers-reduced-motion by rendering instantly.

import { useCallback, useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTypewriter(text: string, charsPerSecond = 42) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const textRef = useRef(text);
  textRef.current = text;
  // Held so skip() can stop the timer. Without this the interval keeps firing
  // after a skip and overwrites the full line with its next short slice.
  const timerRef = useRef(0);

  useEffect(() => {
    if (!text) {
      setShown("");
      setDone(true);
      return;
    }
    if (prefersReducedMotion()) {
      setShown(text);
      setDone(true);
      return;
    }

    setShown("");
    setDone(false);

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, Math.max(8, 1000 / charsPerSecond));
    timerRef.current = id;

    return () => window.clearInterval(id);
  }, [text, charsPerSecond]);

  /** Jump straight to the full line. */
  const skip = useCallback(() => {
    window.clearInterval(timerRef.current);
    setShown(textRef.current);
    setDone(true);
  }, []);

  return { shown, done, skip };
}
