// Portrait-oriented trainer column. Speech bubble sits above the
// character with a downward pointer; character fills the lower half.
// Used in Home (and any future scene that wants a persistent trainer
// presence). When trainerEnabled is false the panel collapses to null
// so the parent grid can reclaim the space.

import { useEffect, useState } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { getSettings } from "@/data/settings/settings";
import { currentTrainer, say } from "@/data/trainers/say";
import { TrainerAvatar } from "./TrainerAvatar";

const BUBBLE_TOTAL_MS = 4500;
const BUBBLE_FADE_MS  = 450;

interface Props {
  /** Speak `category` once on mount (e.g. "greeting" on Home). */
  initialLine?: Parameters<typeof say>[0];
  initialExercise?: string;
  /** Render at a fixed character height, or fill the column. */
  characterHeight?: number;
}

export function TrainerPanel({
  initialLine,
  initialExercise,
  characterHeight = 320,
}: Props) {
  const { text, tick } = useTrainerStore();
  const [bubbleShown,   setBubbleShown]   = useState(false);
  const [bubbleOpacity, setBubbleOpacity] = useState(0);

  // Speak the initial line once after mount.
  useEffect(() => {
    if (!initialLine) return;
    const id = setTimeout(() => say(initialLine, initialExercise), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the bubble timer.
  useEffect(() => {
    if (!text) return;
    if (!getSettings().trainerEnabled) return;
    setBubbleShown(true);
    requestAnimationFrame(() => setBubbleOpacity(1));
    const fadeOut = setTimeout(() => setBubbleOpacity(0),
                                BUBBLE_TOTAL_MS - BUBBLE_FADE_MS);
    const hide    = setTimeout(() => setBubbleShown(false), BUBBLE_TOTAL_MS);
    return () => { clearTimeout(fadeOut); clearTimeout(hide); };
  }, [tick, text]);

  if (!getSettings().trainerEnabled) return null;
  const trainer = currentTrainer();

  return (
    <aside className="flex flex-col items-center gap-2 select-none">
      {/* Speech bubble — always reserves space so the layout doesn't
          shift when the bubble appears. We toggle visibility, not the
          element. */}
      <div className="min-h-[64px] w-full flex items-end justify-center">
        {bubbleShown && text && (
          <div
            className="relative bg-panel border border-border shadow-card rounded-2xl px-4 py-3 text-ink text-sm text-center max-w-full"
            style={{
              opacity: bubbleOpacity,
              transition: `opacity ${BUBBLE_FADE_MS}ms ease`,
            }}
          >
            {text}
            {/* Downward tail pointing at the character's head */}
            <span
              className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3 h-3 bg-panel border-r border-b border-border"
              style={{ transform: "translateX(-50%) rotate(45deg)" }}
            />
          </div>
        )}
      </div>

      {/* Character */}
      <TrainerAvatar
        trainer={trainer}
        orientation="portrait"
        size={characterHeight}
        talking={bubbleShown}
      />

      {/* Name plate */}
      <div className="text-xs font-bold tracking-widest text-gray-dark mt-1">
        {trainer.name.toUpperCase()}
      </div>
    </aside>
  );
}
