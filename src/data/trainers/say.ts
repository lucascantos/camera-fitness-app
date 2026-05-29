// High-level "the trainer says X" function. Picks a line from the
// active trainer's dialogue pool, posts the text to the trainer
// store (so TrainerPanel + Training's status bar surface it), and
// plays the matched audio.

import { playVoice } from "@/audio/voice";
import { postLine } from "@/stores/trainerStore";
import { coach } from "./coach";
import { line, type LineCategory, type Trainer } from "./trainer";

let activeTrainer: Trainer = coach;

/** Swap the active trainer. Currently only Coach is implemented. */
export function setTrainer(t: Trainer): void {
  activeTrainer = t;
}

export function currentTrainer(): Trainer {
  return activeTrainer;
}

export function say(category: LineCategory, exercise?: string): void {
  const l = line(activeTrainer, category, exercise);
  if (!l.text) return;
  postLine(l.text);
  void playVoice(l.audio);
}
