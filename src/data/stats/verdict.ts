// "Was today progress?" for one exercise, against the last session that
// included it. Volume alone can't answer that — 3×12 @ 10 kg and 3×8 @ 12.5 kg
// are different workouts, not better and worse ones — so the call is made in
// order of how much it can be trusted:
//
//   1. Dominance: every set at least as heavy and at least as many reps (and
//      no fewer sets) is progress, every set at most is below. No formula.
//   2. Mixed (heavier but fewer reps, or the reverse): compare the top set's
//      estimated one-rep max, with a band for day-to-day noise. Epley drifts
//      past ~10 reps, so a mixed call involving a high-rep top set is just a
//      different rep range, not a verdict. Mixed sets all at one unchanged
//      weight (some sets up, some down) simply compare total reps.
//
// Bodyweight work compares total reps.

import type { HistorySet } from "@/data/athlete/athlete";
import { epley } from "./progress";

export type VerdictKind = "progress" | "holding" | "below";

export interface Verdict {
  kind: VerdictKind;
  /** Short why, e.g. "+3 reps at 10 kg" or "Est. max +4%". */
  reason: string;
}

/** Inside ±this fraction of last time's estimated max counts as holding. */
const NOISE_BAND = 0.025;
/** Above this many reps the 1RM estimate isn't trusted to break a tie. */
const MAX_TRUSTED_REPS = 10;

const fmtKg = (w: number) => `${Number.isInteger(w) ? w : w.toFixed(1)} kg`;
const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
const repsLabel = (n: number) => `${signed(n)} ${Math.abs(n) === 1 ? "rep" : "reps"}`;

function topSet(sets: HistorySet[]): HistorySet {
  return sets.reduce((a, b) =>
    b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a);
}

const totalReps = (sets: HistorySet[]) => sets.reduce((n, s) => n + s.reps, 0);

/** Every set at one weight → that weight, otherwise null. */
function singleWeight(sets: HistorySet[]): number | null {
  return sets.every((s) => s.weight === sets[0].weight) ? sets[0].weight : null;
}

/**
 * Judge today's sets against last time's. Null when there's nothing fair to
 * compare against: no history, or loaded work against bodyweight work.
 */
export function judge(todayRaw: HistorySet[], lastRaw: HistorySet[] | null): Verdict | null {
  const today = todayRaw.filter((s) => s.reps > 0);
  const last = (lastRaw ?? []).filter((s) => s.reps > 0);
  if (today.length === 0 || last.length === 0) return null;

  const loaded = (sets: HistorySet[]) => sets.some((s) => s.weight > 0);
  if (loaded(today) !== loaded(last)) return null;
  if (!loaded(today)) return judgeReps(totalReps(today), totalReps(last));

  let more = false;
  let less = false;
  for (let i = 0; i < Math.max(today.length, last.length); i++) {
    const t = today[i];
    const l = last[i];
    if (!t) { less = true; continue; }
    if (!l) { more = true; continue; }
    if (t.weight > l.weight || t.reps > l.reps) more = true;
    if (t.weight < l.weight || t.reps < l.reps) less = true;
  }

  if (!more && !less) return { kind: "holding", reason: "Matched last time" };
  if (more !== less) {
    return { kind: more ? "progress" : "below", reason: describeChange(today, last) };
  }
  const w = singleWeight(today);
  if (w !== null && w === singleWeight(last)) {
    const v = judgeReps(totalReps(today), totalReps(last));
    return v.kind === "holding" ? v : { ...v, reason: `${v.reason} at ${fmtKg(w)}` };
  }
  return judgeMixed(topSet(today), topSet(last));
}

function judgeReps(today: number, last: number): Verdict {
  if (today === last) return { kind: "holding", reason: "Matched last time" };
  return { kind: today > last ? "progress" : "below", reason: repsLabel(today - last) };
}

/** What moved, for a clear-cut call: top weight, total reps, set count. */
function describeChange(today: HistorySet[], last: HistorySet[]): string {
  const parts: string[] = [];
  const dw = topSet(today).weight - topSet(last).weight;
  if (dw !== 0) parts.push(`${dw > 0 ? "+" : "−"}${fmtKg(Math.abs(dw))} top set`);

  const dr = totalReps(today) - totalReps(last);
  if (dr !== 0) {
    // "+3 reps at 10 kg" when nothing else changed — the clearest read.
    const w = singleWeight(today);
    const atWeight = dw === 0 && w !== null && w === singleWeight(last) ? ` at ${fmtKg(w)}` : "";
    parts.push(`${repsLabel(dr)}${atWeight}`);
  }

  const ds = today.length - last.length;
  if (ds !== 0) parts.push(`${signed(ds)} ${Math.abs(ds) === 1 ? "set" : "sets"}`);
  return parts.join(" · ");
}

function judgeMixed(today: HistorySet, last: HistorySet): Verdict {
  if (today.reps > MAX_TRUSTED_REPS || last.reps > MAX_TRUSTED_REPS) {
    return { kind: "holding", reason: "Different rep range" };
  }
  const now = epley(today.weight, today.reps);
  const before = epley(last.weight, last.reps);
  const change = (now - before) / before;
  if (Math.abs(change) <= NOISE_BAND) {
    return { kind: "holding", reason: "Est. max about the same" };
  }
  const pct = Math.round(change * 100);
  return { kind: change > 0 ? "progress" : "below", reason: `Est. max ${signed(pct)}%` };
}
