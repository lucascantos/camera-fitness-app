// Ported from: data/trainers.py (legacy FitnessApp repo)
// The Trainer SYSTEM only. Specific trainers live in sibling files.
//
// Lines are no longer picked blindly. Each line may declare a predicate over
// the CoachContext (see ./context.ts) and a priority tier; selection keeps
// only the lines whose predicate holds, takes the highest tier among them,
// avoids anything said recently in the same category, and fills {tokens}
// from the context. A plain string is a line with no predicate and tier 0.

import type { CoachContext } from "./context";
import { fillTemplate } from "./template";

export type LineCategory =
  | "greeting"
  | "intro"
  | "rep"
  | "milestone_half"
  | "milestone_last3"
  | "milestone_last1"
  | "set_complete"
  | "set_short"
  | "switch_side"
  | "rest"
  | "next_exercise"
  | "complete";

export type When = (c: CoachContext) => boolean;

export interface Line {
  text: string;
  /** Only eligible when this holds. Absent = always eligible. */
  when?: When;
  /** Higher wins. Defaults to 0. A gated line usually sits at 1+ so it
   *  beats the generic pool whenever its condition is true. */
  tier?: number;
}

export type LineSpec = string | Line;

/** Shorthand for authoring a gated line. */
export function L(text: string, when?: When, tier = when ? 1 : 0): Line {
  return { text, when, tier };
}

export interface Trainer {
  name: string;
  /** One line for the trainer picker in Settings. */
  tagline: string;
  spritePath: string;             // URL of the sprite asset, or "svg:<key>"
  voiceDir: string;               // base URL for voice clips (optional)
  /** Per-exercise intro pools, keyed by catalog name. Falls back to
   *  `pools.intro` for exercises without a dedicated pool. */
  intros: Record<string, LineSpec[]>;
  /** Dialogue pools per category. */
  pools: Partial<Record<Exclude<LineCategory, "intro"> | "intro", LineSpec[]>>;
}

export interface SpokenLine {
  text: string;
  audio: string | null;
}

// ── Selection ──────────────────────────────────────────────────────────

/** Recently used line templates per trainer+category, newest last. */
const recent = new Map<string, string[]>();
const RECENT_LIMIT = 4;

function normalise(spec: LineSpec): Line {
  return typeof spec === "string" ? { text: spec } : spec;
}

function pickIndex(specs: LineSpec[], ctx: CoachContext, memoryKey: string): number {
  const eligible: { i: number; line: Line }[] = [];
  for (let i = 0; i < specs.length; i++) {
    const line = normalise(specs[i]);
    if (line.when && !line.when(ctx)) continue;
    eligible.push({ i, line });
  }
  if (eligible.length === 0) return -1;

  const top = Math.max(...eligible.map((e) => e.line.tier ?? 0));
  const tier = eligible.filter((e) => (e.line.tier ?? 0) === top);

  const seen = recent.get(memoryKey) ?? [];
  const fresh = tier.filter((e) => !seen.includes(e.line.text));
  const pool = fresh.length > 0 ? fresh : tier;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const next = [...seen, chosen.line.text].slice(-RECENT_LIMIT);
  recent.set(memoryKey, next);
  return chosen.i;
}

/**
 * Pick a line from the requested category for the given context.
 * Audio URL is constructed deterministically from the line's index in its
 * declared pool and returned even if the file doesn't exist — the audio
 * layer handles the missing-file case.
 */
export function line(
  t: Trainer,
  category: LineCategory,
  ctx: CoachContext,
): SpokenLine {
  if (category === "intro") {
    // The exercise's own cues and the shared intro pool compete on tier, so
    // a "new personal best" line beats a form cue when it applies.
    const dedicated = t.intros[ctx.exercise] ?? [];
    const shared = t.pools.intro ?? [];
    const idx = pickIndex([...dedicated, ...shared], ctx, `${t.name}/intro/${ctx.exercise}`);
    if (idx < 0) return { text: "", audio: null };
    const exSlug = ctx.exercise.replace(/\s+/g, "_");
    const own = idx < dedicated.length;
    const spec = own ? dedicated[idx] : shared[idx - dedicated.length];
    const audio = own
      ? `${t.voiceDir}/intro/${exSlug}/${idx + 1}.mp3`
      : `${t.voiceDir}/intro/${idx - dedicated.length + 1}.mp3`;
    return { text: fillTemplate(normalise(spec).text, ctx), audio };
  }

  const specs = t.pools[category] ?? [];
  const idx = pickIndex(specs, ctx, `${t.name}/${category}`);
  if (idx < 0) return { text: "", audio: null };
  return {
    text: fillTemplate(normalise(specs[idx]).text, ctx),
    audio: `${t.voiceDir}/${category}/${idx + 1}.mp3`,
  };
}

/** Forget what was said recently (tests / trainer swap). */
export function resetLineMemory(): void {
  recent.clear();
}
