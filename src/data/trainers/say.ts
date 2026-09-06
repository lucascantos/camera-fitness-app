// High-level "the trainer says X" function. Builds the coach's view of the
// moment, picks a line from the active trainer's pool for it, posts the
// text to the trainer store (so whichever surface is mounted shows it) and
// plays the matched audio.

import { playVoice } from "@/audio/voice";
import { postLine } from "@/stores/trainerStore";
import { coach } from "./coach";
import { buildContext, type ContextOverrides } from "./context";
import { line, resetLineMemory, type LineCategory, type Trainer } from "./trainer";

let activeTrainer: Trainer = coach;

/** Swap the active trainer. Currently only Coach is implemented. */
export function setTrainer(t: Trainer): void {
  activeTrainer = t;
  resetLineMemory();
}

export function currentTrainer(): Trainer {
  return activeTrainer;
}

/**
 * Say a line from `category`. `over` supplies whatever the call site knows
 * that the session store doesn't (the rep just counted, the set's real rep
 * count, the PRs of a finished session). Returns the text, "" if the pool
 * had nothing to say.
 */
export function say(category: LineCategory, over: ContextOverrides = {}): string {
  const l = line(activeTrainer, category, buildContext(over));
  if (!l.text) return "";
  postLine(l.text);
  void playVoice(l.audio);
  return l.text;
}
