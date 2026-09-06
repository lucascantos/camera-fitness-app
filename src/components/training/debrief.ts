// What the coach needs to know to debrief a finished session: how many sets
// hit their prescription, how many fell short, and which exercises set a
// new top weight. Must run BEFORE awardSession() writes the session into
// history, or every set would be compared against itself.

import type { Session } from "@/data/plans/plans";
import { bestSetFor } from "@/data/athlete/bestSet";
import { titleCase } from "@/lib/format";

export interface Debrief {
  setsHit: number;
  setsMissed: number;
  prs: string[];
}

export function debriefSession(session: Session): Debrief {
  let setsHit = 0;
  let setsMissed = 0;
  const prs: string[] = [];

  for (const w of session.workouts) {
    const best = bestSetFor(w.exercise);
    let topWeight = 0;
    for (const s of w.sets) {
      const target = s[0] as number;
      const amrap = Boolean(s[2]);
      const actual = s[3] as { reps: number; weight: number } | undefined;
      const reps = actual?.reps ?? target;
      const weight = actual?.weight ?? (s[1] as number);
      if (reps <= 0) continue;
      if (amrap || reps >= target) setsHit++; else setsMissed++;
      if (weight > topWeight) topWeight = weight;
    }
    if (topWeight > 0 && best !== null && topWeight > best.weight) {
      prs.push(titleCase(w.exercise));
    }
  }
  return { setsHit, setsMissed, prs };
}
