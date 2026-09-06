// The coach's voice on the workout screen: one short caption over the camera
// feed, just above the rep bar, gone again after a few seconds. Text only —
// no avatar, no panel — so it never competes with the feed the user is
// posing against. Respects the trainer toggle in settings.

import { useEffect, useState } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { getSettings } from "@/data/settings/settings";

const SHOW_MS = 3800;
const FADE_MS = 350;

export function CoachCaption() {
  const { text, tick } = useTrainerStore();
  const [shown, setShown] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!text || !getSettings().trainerEnabled) return;
    setShown(true);
    requestAnimationFrame(() => setOpacity(1));
    const fade = setTimeout(() => setOpacity(0), SHOW_MS - FADE_MS);
    const hide = setTimeout(() => setShown(false), SHOW_MS);
    return () => { clearTimeout(fade); clearTimeout(hide); };
  }, [tick, text]);

  if (!shown || !text) return null;

  return (
    <div
      className="absolute inset-x-0 flex justify-center px-6 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      aria-live="polite"
    >
      <div
        className="max-w-md bg-black/65 text-white text-sm font-semibold text-center rounded-2xl px-4 py-2.5 backdrop-blur-sm shadow-lg"
        style={{ opacity, transition: `opacity ${FADE_MS}ms ease` }}
      >
        {text}
      </div>
    </div>
  );
}
