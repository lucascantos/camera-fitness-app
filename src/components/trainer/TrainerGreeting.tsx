// Compact greeting card shown on Home. Fires a "greeting" line on mount
// so the trainer's voice + bubble play once when the user lands.

import { useEffect } from "react";
import { currentTrainer } from "@/data/trainers/say";
import { say } from "@/data/trainers/say";
import { TrainerAvatar } from "./TrainerAvatar";

export function TrainerGreeting() {
  const trainer = currentTrainer();

  useEffect(() => {
    // Slight delay so it fires after the page paints and after the
    // first-gesture audio unlock has had a chance to run.
    const id = setTimeout(() => say("greeting"), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="bg-panel border border-border rounded-3xl shadow-card p-4 flex items-center gap-4">
      <TrainerAvatar trainer={trainer} size={72} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          YOUR TRAINER
        </div>
        <div className="text-lg font-extrabold text-ink truncate">
          {trainer.name}
        </div>
        <div className="text-xs text-gray-dark">
          Calm, focused, no-nonsense.
        </div>
      </div>
    </div>
  );
}
