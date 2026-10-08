// In-memory movement traces for the current session: the tracked joint angle
// over time, plus the moment each rep was counted, for every set (and side).
// The Session Summary reads them to draw each exercise's average rep and to
// time its tempo.
//
// Deliberately not persisted — a few thousand numbers per set is cheap to hold
// for one workout, but not worth growing saved history for. A reload mid-
// workout simply loses the traces of the sets before it.

export interface SetTrace {
  /** performance.now() of each sample. */
  t: number[];
  angle: number[];
  /** performance.now() of each counted rep (the return to the rest position). */
  reps: number[];
}

/** Hard cap per trace, ~2 minutes at 30 fps. */
const MAX_SAMPLES = 4000;

let sessionId: string | null = null;
const traces = new Map<string, SetTrace>();

const keyOf = (workoutIdx: number, setIdx: number, side: string) =>
  `${workoutIdx}:${setIdx}:${side}`;

function trace(sid: string, workoutIdx: number, setIdx: number, side: string): SetTrace {
  if (sid !== sessionId) { traces.clear(); sessionId = sid; }
  const key = keyOf(workoutIdx, setIdx, side);
  let tr = traces.get(key);
  if (!tr) { tr = { t: [], angle: [], reps: [] }; traces.set(key, tr); }
  return tr;
}

export function recordSample(
  sid: string, workoutIdx: number, setIdx: number, side: string, t: number, angle: number,
): void {
  const tr = trace(sid, workoutIdx, setIdx, side);
  if (tr.t.length >= MAX_SAMPLES) return;
  tr.t.push(t);
  tr.angle.push(angle);
}

export function recordRep(
  sid: string, workoutIdx: number, setIdx: number, side: string, t: number,
): void {
  trace(sid, workoutIdx, setIdx, side).reps.push(t);
}

/** Every trace recorded for one exercise of the given session. */
export function tracesFor(sid: string, workoutIdx: number): SetTrace[] {
  if (sid !== sessionId) return [];
  const out: SetTrace[] = [];
  for (const [key, tr] of traces) {
    if (key.startsWith(`${workoutIdx}:`)) out.push(tr);
  }
  return out;
}
