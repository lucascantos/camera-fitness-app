// Speech bubble fed by the global trainer store. Mount once in App.tsx
// and any scene that calls say() will trigger the bubble + audio.

import { useEffect, useState } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { getSettings } from "@/data/settings/settings";

const TOTAL_MS = 4500;
const FADE_MS  = 450;

export function TrainerHUD() {
  const { text, tick } = useTrainerStore();
  const [shown,   setShown]   = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!text)                          return;
    if (!getSettings().trainerEnabled)  return;

    setShown(true);
    // Force a re-paint so the opacity transition runs on repeat lines.
    requestAnimationFrame(() => setOpacity(1));
    const fadeOut = setTimeout(() => setOpacity(0), TOTAL_MS - FADE_MS);
    const hide    = setTimeout(() => setShown(false), TOTAL_MS);
    return () => { clearTimeout(fadeOut); clearTimeout(hide); };
  }, [tick, text]);

  if (!shown || !text) return null;
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-panel border border-border text-ink shadow-card max-w-md text-center pointer-events-none z-50"
      style={{
        opacity,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      {text}
    </div>
  );
}
