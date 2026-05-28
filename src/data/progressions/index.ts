// Strategy registry — single source of truth for available progressions.

import type { ProgressionId, ProgressionStrategy } from "./base";
import { linear }         from "./linear";
import { fiveThreeOne }   from "./fiveThreeOne";
import { volume }         from "./volume";

const REGISTRY: Record<ProgressionId, ProgressionStrategy> = {
  linear,
  five_three_one: fiveThreeOne,
  volume,
};

export function getStrategy(id: ProgressionId | string): ProgressionStrategy {
  return REGISTRY[id as ProgressionId] ?? linear;
}

export const STRATEGIES: ProgressionStrategy[] = [linear, fiveThreeOne, volume];

export type { ProgressionId, ProgressionStrategy };
