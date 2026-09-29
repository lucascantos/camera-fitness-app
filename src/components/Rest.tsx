// Ported from: scenes/rest.py (legacy FitnessApp repo)

import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { getSettings } from "@/data/settings/settings";
import { restTick } from "@/audio/sfx";
import { notifyRestOver } from "@/notifications/restAlert";
import { say } from "@/data/trainers/say";
import { useTrainerStore } from "@/stores/trainerStore";
import { CoachLine } from "@/components/trainer/CoachLine";

export function Rest() {
  const duration = getSettings().restSeconds;
  const [remaining, setRemaining] = useState(duration);
  const { goTo } = useSessionStore();
  const tickedRef = useRef<Set<number>>(new Set());

  // The set-complete line is still on screen when Rest opens; let it sit,
  // then hand over to a rest line once the user has had a moment. If the
  // coach had nothing to say about the set, speak straight away.
  useEffect(() => {
    const hadLine = Date.now() - useTrainerStore.getState().at < 3000;
    const delay = hadLine ? Math.min(duration * 400, 12_000) : 300;
    const id = setTimeout(() => say("rest"), delay);
    return () => clearTimeout(id);
  }, [duration]);

  useEffect(() => {
    setRemaining(duration);
    tickedRef.current = new Set();
    const start = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(id);
      clearTimeout(endId);
      notifyRestOver();
      goTo("training");
    };
    const id = setInterval(() => {
      const left = duration - Math.floor((Date.now() - start) / 1000);
      setRemaining(left);
      // Tick on the last 3 seconds — once per integer second.
      if (left > 0 && left <= 3 && !tickedRef.current.has(left)) {
        tickedRef.current.add(left);
        restTick();
      }
      if (left <= 0) finish();
    }, 100);
    // Backstop for when the app is in the background: browsers throttle a
    // repeating 100ms interval in hidden tabs far harder than a single
    // timeout, so this keeps the "rest over" alert close to on time.
    const endId = setTimeout(finish, duration * 1000);
    return () => { clearInterval(id); clearTimeout(endId); };
  }, [duration, goTo]);

  const pct = Math.max(0, (remaining / duration) * 100);

  return (
    <div className="p-4 lg:p-10 lg:h-full">
      <div>
        <div className="bg-panel rounded-3xl p-6 lg:p-10 max-w-3xl border border-border shadow-card">
          <div className="text-accent text-3xl font-extrabold">REST</div>
          <CoachLine className="mt-4" />
          <div className="text-[5rem] lg:text-[8rem] font-black leading-none mt-4 text-ink">
            {Math.max(0, remaining)}
          </div>
          <div className="text-gray-dark text-lg">seconds remaining</div>
          <div className="mt-6 h-3 bg-panel-dark rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button
            onClick={() => goTo("training")}
            className="mt-8 bg-accent text-on_accent font-bold py-3 px-8 rounded-2xl hover:bg-accent-hov transition"
          >
            Skip Rest  →
          </button>
        </div>
      </div>
    </div>
  );
}
