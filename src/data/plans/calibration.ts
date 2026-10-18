// The Calibration session offered at the end of onboarding: one dumbbell
// session covering the big four movements, 3 sets each, to find the
// athlete's starting numbers. No weight is prescribed (0 kg): these are new
// exercises, so the athlete picks the weight on each set's setup step.
// See docs/guided-mode-design.md §4.

import { makeSession, type PrescribedSet, type Session } from "./plans";

const EXERCISES = [
  "dumbbell squat",
  "dumbbell press",            // the dumbbell bench press
  "dumbbell overhead press",
  "dumbbell deadlift",
];
const SETS = 3;
const REPS = 10;

export function makeCalibrationSession(): Session {
  const sets: PrescribedSet[] = Array.from({ length: SETS }, () => [REPS, 0, false]);
  return makeSession("Calibration", EXERCISES.map((e) => [e, sets]));
}
