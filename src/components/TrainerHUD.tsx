// Persistent trainer presence: the trainer character sits in the bottom-
// right corner of fullscreen scenes (training / rest / complete) with a
// speech bubble pointing to them when say() fires.

import { useEffect, useState } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { getSettings } from "@/data/settings/settings";
import { useSessionStore } from "@/stores/sessionStore";
import { currentTrainer } from "@/data/trainers/say";
import { TrainerAvatar } from "./trainer/TrainerAvatar";

const BUBBLE_TOTAL_MS = 4500;
const BUBBLE_FADE_MS  = 450;

const FULLSCREEN_SCENES = new Set(["training", "rest", "complete"]);

export function TrainerHUD() {
  const { text, tick } = useTrainerStore();
  const scene = useSessionStore((s) => s.scene);
  const [bubbleShown,   setBubbleShown]   = useState(false);
  const [bubbleOpacity, setBubbleOpacity] = useState(0);

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

  // Trainer character only persists during the workout flow.
  const showCharacter = FULLSCREEN_SCENES.has(scene)
    && getSettings().trainerEnabled;
  // Bubble can still fire on Home (e.g. greeting) — but without the
  // persistent avatar, render it bottom-center.
  const showBubble = bubbleShown
    && text
    && getSettings().trainerEnabled;

  if (!showCharacter && !showBubble) return null;
  const trainer = currentTrainer();

  return (
    <>
      {showCharacter && (
        <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end pointer-events-none">
          {/* Speech bubble — appears above + to the left, with a tail
              pointing down to the avatar. */}
          {showBubble && (
            <div
              className="mb-2 mr-2 max-w-xs bg-panel border border-border shadow-card rounded-2xl px-4 py-3 text-ink text-sm transition-opacity"
              style={{
                opacity: bubbleOpacity,
                transition: `opacity ${BUBBLE_FADE_MS}ms ease`,
              }}
            >
              {text}
              {/* Tail */}
              <div
                className="absolute -bottom-1 right-8 w-3 h-3 bg-panel border-r border-b border-border"
                style={{ transform: "rotate(45deg)" }}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <TrainerAvatar trainer={trainer} size={96} talking={!!showBubble} />
          </div>
          <div className="mt-1 text-xs font-bold text-ink/70 mr-1">
            {trainer.name}
          </div>
        </div>
      )}

      {/* Bubble on non-fullscreen scenes — bottom-centered, no character. */}
      {!showCharacter && showBubble && (
        <div
          className="fixed left-1/2 bottom-8 -translate-x-1/2 max-w-md bg-panel border border-border shadow-card rounded-2xl px-5 py-3 text-ink text-center pointer-events-none z-40"
          style={{
            opacity: bubbleOpacity,
            transition: `opacity ${BUBBLE_FADE_MS}ms ease`,
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}
