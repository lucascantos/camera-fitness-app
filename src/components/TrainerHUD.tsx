// Ported from: scenes/trainer_hud.py (legacy FitnessApp repo)
// Speech bubble shown when the trainer "says" something.

import { useEffect, useState } from "react";
import { getSettings } from "@/data/settings/settings";

interface Props { text: string; }

const TOTAL_MS = 4500;
const FADE_MS = 450;

export function TrainerHUD({ text }: Props) {
  const [shown, setShown] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!text || !getSettings().trainerEnabled) return;
    setShown(true);
    setOpacity(1);
    const fadeOut = setTimeout(() => setOpacity(0), TOTAL_MS - FADE_MS);
    const hide = setTimeout(() => setShown(false), TOTAL_MS);
    return () => { clearTimeout(fadeOut); clearTimeout(hide); };
  }, [text]);

  if (!shown || !text) return null;
  return (
    <div
      className="fixed bottom-32 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-panel border border-border text-white shadow-lg transition-opacity"
      style={{ opacity, transitionDuration: `${FADE_MS}ms` }}
    >
      {text}
    </div>
  );
}
