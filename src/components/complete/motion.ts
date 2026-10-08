// Average rep and tempo for one exercise, from the session's movement traces
// (src/tracking/setTrace). Each counted rep is a span between two count
// moments: rest → turning point → rest. Spans are resampled onto a common
// 0–100% time axis and averaged into one curve; the turning point splits each
// rep into its two halves for the tempo.

import type { SetTrace } from "@/tracking/setTrace";

export interface RepMotion {
  /** Mean joint angle at POINTS evenly spaced through the rep. */
  curve: number[];
  /** Mean ± one standard deviation — how consistent the reps were. */
  lo: number[];
  hi: number[];
  reps: number;
  /** Seconds. */
  repSec: number;
  /** Tempo: the first and second halves of the rep, in movement order. */
  firstSec: number;
  secondSec: number;
  firstLabel: "Lower" | "Lift";
  secondLabel: "Lower" | "Lift";
  /** Mean range of motion per rep, degrees. */
  rom: number;
}

const POINTS = 48;
const MIN_SAMPLES = 6;
const MIN_REP_MS = 300;

// Movements whose rep starts by lowering (rest = top): moving into the working
// position is the eccentric half. Everything else lifts first.
const LOWER_FIRST = new Set([
  "squat", "front squat", "dumbbell squat", "split squat", "push ups",
  "bench press", "dumbbell press", "deadlift", "dumbbell deadlift",
  "skull crusher", "one arm triceps extension",
]);

interface Rep { angles: number[]; ms: number; firstMs: number; rom: number }

function cut(tr: SetTrace, t0: number, t1: number): Rep | null {
  const ts: number[] = [], as: number[] = [];
  for (let i = 0; i < tr.t.length; i++) {
    if (tr.t[i] >= t0 && tr.t[i] <= t1) { ts.push(tr.t[i]); as.push(tr.angle[i]); }
  }
  if (as.length < MIN_SAMPLES) return null;

  // Turning point: the sample farthest from where the rep starts and ends.
  const mid = (as[0] + as[as.length - 1]) / 2;
  let turn = 0;
  for (let i = 1; i < as.length; i++) if (Math.abs(as[i] - mid) > Math.abs(as[turn] - mid)) turn = i;

  const angles: number[] = [];
  let j = 0;
  for (let k = 0; k < POINTS; k++) {
    const t = ts[0] + ((ts[ts.length - 1] - ts[0]) * k) / (POINTS - 1);
    while (j < ts.length - 2 && ts[j + 1] < t) j++;
    const span = ts[j + 1] - ts[j] || 1;
    const f = Math.min(1, Math.max(0, (t - ts[j]) / span));
    angles.push(as[j] + (as[j + 1] - as[j]) * f);
  }
  return {
    angles, ms: t1 - t0, firstMs: ts[turn] - t0,
    rom: Math.max(...as) - Math.min(...as),
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

export function repMotion(exercise: string, traces: SetTrace[]): RepMotion | null {
  const spans: [SetTrace, number, number][] = [];
  for (const tr of traces) {
    for (let i = 1; i < tr.reps.length; i++) spans.push([tr, tr.reps[i - 1], tr.reps[i]]);
  }
  if (spans.length === 0) return null;
  // The first rep of a set has no earlier count to start from; give it the
  // typical rep length.
  const typical = median(spans.map(([, a, b]) => b - a));
  for (const tr of traces) if (tr.reps.length > 0) spans.push([tr, tr.reps[0] - typical, tr.reps[0]]);

  // Drop spans that are really two reps (a re-count jump) or a glitch.
  const reps = spans
    .filter(([, a, b]) => b - a >= MIN_REP_MS && b - a <= typical * 2)
    .map(([tr, a, b]) => cut(tr, a, b))
    .filter((r): r is Rep => r !== null);
  if (reps.length < 2) return null;

  const curve: number[] = [], lo: number[] = [], hi: number[] = [];
  for (let k = 0; k < POINTS; k++) {
    const vals = reps.map((r) => r.angles[k]);
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)));
    curve.push(m); lo.push(m - sd); hi.push(m + sd);
  }
  const lowerFirst = LOWER_FIRST.has(exercise);
  const repMs = mean(reps.map((r) => r.ms));
  const firstMs = mean(reps.map((r) => r.firstMs));
  return {
    curve, lo, hi, reps: reps.length,
    repSec: repMs / 1000,
    firstSec: firstMs / 1000,
    secondSec: (repMs - firstMs) / 1000,
    firstLabel: lowerFirst ? "Lower" : "Lift",
    secondLabel: lowerFirst ? "Lift" : "Lower",
    rom: mean(reps.map((r) => r.rom)),
  };
}
