// Rest countdown shared by the between-sets (Rest) and between-exercises
// (NextExercise) screens: ticks on the last three seconds, fires the opt-in
// "rest over" notification, then calls `onDone`.

import { useEffect, useRef, useState } from "react";
import { restTick } from "@/audio/sfx";
import { notifyRestOver } from "@/notifications/restAlert";

/** Returns the whole seconds left (never below 0). */
export function useRestTimer(duration: number, onDone: () => void): number {
  const [remaining, setRemaining] = useState(duration);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setRemaining(duration);
    const ticked = new Set<number>();
    const start = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(id);
      clearTimeout(endId);
      notifyRestOver();
      onDoneRef.current();
    };
    const id = setInterval(() => {
      const left = duration - Math.floor((Date.now() - start) / 1000);
      setRemaining(left);
      // Tick on the last 3 seconds — once per integer second.
      if (left > 0 && left <= 3 && !ticked.has(left)) {
        ticked.add(left);
        restTick();
      }
      if (left <= 0) finish();
    }, 100);
    // Backstop for when the app is in the background: browsers throttle a
    // repeating 100ms interval in hidden tabs far harder than a single
    // timeout, so this keeps the "rest over" alert close to on time.
    const endId = setTimeout(finish, duration * 1000);
    return () => { clearInterval(id); clearTimeout(endId); };
  }, [duration]);

  return Math.max(0, remaining);
}
