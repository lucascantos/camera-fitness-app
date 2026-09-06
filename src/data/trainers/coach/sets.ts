// Coach — set boundaries: the set finished, the set fell short, the arm
// swap on unilateral work, the rest timer, and the hand-off to the next
// exercise.

import { L, type LineSpec } from "../trainer";

export const SET_COMPLETE: LineSpec[] = [
  L("That's a new best on {exercise}. I'd write it down, but I already did.",
    (c) => c.isPrWeight, 3),
  L("{reps} on the AMRAP. That's the number I use to set next week.",
    (c) => c.amrap, 2),
  L("Heavier than last time and it looked the same. Good sign.",
    (c) => c.isNewWeight, 2),
  L("{exercise} done. Shake it out.",
    (c) => c.isLastSet && c.setCount > 1, 2),
  L("That's the last set. The rest of the day is easier than that was.",
    (c) => c.isLastSet && c.isLastExercise, 2),
  L("First set down. The next {sets} are the same, only more tired.",
    (c) => c.isFirstSet && c.setCount > 2, 1),
  L("Set {set} of {sets}. Recover. Properly.",
    (c) => !c.isFirstSet && !c.isLastSet, 1),
  "Good set. Sit down.",
  "Done. Breathe before you think about the next one.",
  "Clean set. Rest is part of the program, not a break from it.",
  "That'll do. Nothing to correct, which is rare.",
  "Set. Water, then we go again.",
];

export const SET_SHORT: LineSpec[] = [
  L("{reps} of {target}. Short by one. That's a rest problem, not a strength problem.",
    (c) => c.short === 1, 2),
  L("{reps}. The new weight bit back. It'll be there next time, and so will you.",
    (c) => c.isNewWeight, 2),
  L("{reps} of {target} on the last set. Fatigue, not failure. Log it and move on.",
    (c) => c.isLastSet && c.setCount > 1, 1),
  "{reps} of {target}. Fine. That's data, not a verdict.",
  "Short by {short}. The weight stays put until you hit it twice.",
  "Missed a few. Rest a bit longer this time, then again.",
  "{reps}. Better an honest {reps} than {target} with your back doing the curling.",
];

export const SWITCH_SIDE: LineSpec[] = [
  "Other arm.",
  "Swap. Left arm now, same tempo.",
  "Right's done. Left doesn't get to be lazier.",
  "Switch. Match the reps — no favourites.",
  "Left arm. Same range, same speed, same standard.",
];

export const REST: LineSpec[] = [
  L("Next up: set {nextset} of {sets}. Same weight, same standard.",
    (c) => c.setIdx + 1 < c.setCount, 1),
  L("One more set of {exercise} after this. Then it's over.",
    (c) => c.setIdx + 1 === c.setCount - 1 && c.setCount > 1, 2),
  L("{exercise} at {weight}. Think about the first rep, not the whole set.",
    (c) => c.weight > 0, 1),
  "Breathe. Slower than you want to.",
  "Sit if you want. Just don't scroll.",
  "Hydrate. Then think about the first rep, not the whole set.",
  "Rest is programmed. Don't cut it short because you feel fine — you'll feel fine for two reps.",
  "Loosen the hands. The grip carries more tension than you think.",
  "Nothing to fix from that set. Enjoy it, it won't last.",
];

export const NEXT_EXERCISE: LineSpec[] = [
  L("{exercise} done. {next} is the last one today. Finish clean.",
    (c) => c.remainingExercises === 1, 2),
  L("That's {exercise}. {next} next, then {after} after that.",
    (c) => c.remainingExercises >= 2, 1),
  "{exercise} in the book. On to {next}.",
  "Done with {exercise}. {next} — take a minute, then set up.",
  "Good. {next} next. Different muscles, same rules.",
  "{exercise}, done. Grab water. {next} is up.",
];
