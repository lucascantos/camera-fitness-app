// Ported from: scenes/rest.py (legacy FitnessApp repo)

import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { getSettings } from "@/data/settings/settings";
import { say } from "@/data/trainers/say";
import { restTick } from "@/audio/sfx";

export function Rest() {
  const duration = getSettings().restSeconds;
  const [remaining, setRemaining] = useState(duration);
  const { goTo } = useSessionStore();
  const tickedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    say("rest");
    setRemaining(duration);
    tickedRef.current = new Set();
    const start = Date.now();
    const id = setInterval(() => {
      const left = duration - Math.floor((Date.now() - start) / 1000);
      setRemaining(left);
      // Tick on the last 3 seconds — once per integer second.
      if (left > 0 && left <= 3 && !tickedRef.current.has(left)) {
        tickedRef.current.add(left);
        restTick();
      }
      if (left <= 0) { clearInterval(id); goTo("training"); }
    }, 100);
    return () => clearInterval(id);
  }, [duration, goTo]);

  const pct = Math.max(0, (remaining / duration) * 100);

  return (
    <div className="p-10 h-full">
      <div className="bg-panel rounded-3xl p-10 max-w-3xl">
        <div className="text-accent text-3xl font-extrabold">REST</div>
        <div className="text-[8rem] font-black leading-none mt-4">{Math.max(0, remaining)}</div>
        <div className="text-gray text-lg">seconds remaining</div>
        <div className="mt-6 h-3 bg-panel-dark rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button
          onClick={() => goTo("training")}
          className="mt-8 bg-accent text-on_accent font-bold py-3 px-8 rounded-2xl"
        >
          Skip Rest  →
        </button>
      </div>
    </div>
  );
}
