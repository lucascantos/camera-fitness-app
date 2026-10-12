// Which plan and which of its days comes next. Shared by Home (the Start
// button) and the session preview, so both always agree on "today".

import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import { DEFAULT_PLANS, getCachedPlans, type Plan } from "@/data/plans/plans";

/** Resolve the active plan from settings; fall back to first available. */
export function resolveActivePlan(): Plan {
  const aid = getSettings().activePlanId;
  const pool = getCachedPlans().length > 0 ? getCachedPlans() : DEFAULT_PLANS;
  if (aid) {
    const m = pool.find((p) => p.id === aid);
    if (m) return m;
  }
  return pool[0];
}

/** Compute which workout day to run, mirroring legacy's `_day_cursor % n`. */
export function resolveDayIndex(plan: Plan): number {
  const state = (getAthlete().progress as Record<string, { _day_cursor?: number }>)[plan.id];
  const cursor = state?._day_cursor ?? 0;
  return cursor % Math.max(1, plan.workouts.length);
}

export function dayLabel(name: string): string {
  return name.length === 1 ? `Day ${name}` : name;
}
