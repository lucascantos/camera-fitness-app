// Compact coach presence for scenes that can't afford the full portrait
// panel: a small avatar chip and one line of text in a row. Home, Rest and
// Complete use it. Optionally speaks a category on mount; otherwise it just
// shows whatever the coach last said (Rest, where the set-complete line is
// still the relevant one when the screen appears).

import { useEffect, useRef, useState } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { getSettings } from "@/data/settings/settings";
import { currentTrainer, say } from "@/data/trainers/say";
import type { ContextOverrides } from "@/data/trainers/context";
import type { LineCategory } from "@/data/trainers/trainer";
import { TrainerAvatar } from "./TrainerAvatar";

/** A line older than this when the row mounts belongs to the previous scene. */
const STALE_MS = 3000;

interface Props {
  /** Speak this category once, shortly after mount. */
  speak?: LineCategory;
  context?: ContextOverrides;
  delayMs?: number;
  className?: string;
}

export function CoachLine({ speak, context, delayMs = 300, className = "" }: Props) {
  const { text, tick } = useTrainerStore();
  // When we're going to speak ourselves, ignore whatever was left in the
  // store by the previous scene until our own line lands.
  const mountTick = useRef(tick);
  const freshAtMount = useRef(Date.now() - useTrainerStore.getState().at < STALE_MS);
  const [spoken, setSpoken] = useState(!speak);

  useEffect(() => {
    if (!speak) return;
    const id = setTimeout(() => { say(speak, context); setSpoken(true); }, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!getSettings().trainerEnabled) return null;
  const carriedOver = !speak && freshAtMount.current;
  const visible = spoken && (tick !== mountTick.current || carriedOver) ? text : "";
  if (!visible) return null;

  return (
    <div
      className={`flex items-center gap-3 bg-panel border border-border rounded-2xl px-3 py-2.5 shadow-card ${className}`}
      aria-live="polite"
    >
      <div className="shrink-0 rounded-xl overflow-hidden">
        <TrainerAvatar trainer={currentTrainer()} size={40} talking />
      </div>
      <div className="text-sm text-ink leading-snug">{visible}</div>
    </div>
  );
}
