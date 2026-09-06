// {token} substitution for trainer lines. Tokens map onto CoachContext
// fields with a little formatting (weights print as "60kg", not "60").

import type { CoachContext } from "./context";

function kg(w: number): string {
  if (w <= 0) return "bodyweight";
  const n = Number.isInteger(w) ? String(w) : w.toFixed(1);
  return `${n}kg`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const TOKENS: Record<string, (c: CoachContext) => string> = {
  exercise:  (c) => c.exerciseLabel,
  next:      (c) => c.nextExerciseLabel,
  reps:      (c) => String(c.reps),
  target:    (c) => String(c.target),
  remaining: (c) => String(c.remaining),
  short:     (c) => String(c.short),
  weight:    (c) => kg(c.weight),
  last:      (c) => kg(c.lastWeight ?? 0),
  best:      (c) => kg(c.bestWeight ?? 0),
  set:       (c) => String(c.setIdx + 1),
  sets:      (c) => String(c.setCount),
  nextset:   (c) => String(c.setIdx + 2),
  left:      (c) => plural(c.remainingExercises, "exercise"),
  after:     (c) => plural(Math.max(0, c.remainingExercises - 1), "exercise"),
  days:      (c) => plural(c.daysSinceLast ?? 0, "day"),
  week:      (c) => plural(c.sessionsThisWeek, "session"),
  total:     (c) => plural(c.totalSessions, "session"),
  hit:       (c) => plural(c.setsHit, "set"),
  missed:    (c) => plural(c.setsMissed, "set"),
  prs:       (c) => list(c.prs),
};

export function fillTemplate(text: string, ctx: CoachContext): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => {
    const fn = TOKENS[key];
    return fn ? fn(ctx) : m;
  });
}
