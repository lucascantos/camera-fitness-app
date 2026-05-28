// Trainer registry. New trainers slot in here.

import type { Trainer } from "./trainer";
import { coach } from "./coach";

export const TRAINERS: Trainer[] = [coach];

export function trainerById(id: string): Trainer {
  return TRAINERS.find((t) => t.name === id) ?? coach;
}

export { coach };
