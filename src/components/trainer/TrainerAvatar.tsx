// Dispatcher — picks the right SVG portrait for a given Trainer.
// As new trainers are added their svg key gets a case here.

import type { Trainer } from "@/data/trainers/trainer";
import { CoachAvatar } from "./CoachAvatar";

interface Props {
  trainer: Trainer;
  size?: number;
  talking?: boolean;
  orientation?: "chip" | "portrait";
}

export function TrainerAvatar({
  trainer, size = 96, talking = false, orientation = "chip",
}: Props) {
  if (trainer.spritePath === "svg:coach") {
    return (
      <CoachAvatar size={size} talking={talking} orientation={orientation} />
    );
  }
  // Fallback: monogram chip. Used when the trainer ships a raster
  // sprite we haven't built an SVG for yet.
  return (
    <div
      className="rounded-2xl bg-nav text-white grid place-items-center font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {trainer.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
