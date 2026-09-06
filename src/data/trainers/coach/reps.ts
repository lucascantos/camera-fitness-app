// Coach — mid-set lines: the periodic rep nod and the three milestones.
// Cadence is decided in components/training/repFeedback.ts; this file only
// decides what gets said once the cadence fires.

import { L, type LineSpec } from "../trainer";

export const REPS: LineSpec[] = [
  L("{reps}. Keep going until it gets ugly, then stop.", (c) => c.amrap, 1),
  L("{reps} and counting. Form's still there. Carry on.", (c) => c.amrap, 1),
  L("{reps}. Don't count. I'm counting. You lift.", (c) => c.amrap, 1),
  L("That's {reps} at {weight}. Heavier than last time and it looks the same.",
    (c) => c.isNewWeight && c.reps >= 3, 2),
  "Good.",
  "Clean.",
  "That one counted.",
  "Same again.",
  "Slower on the way down.",
  "Breathe out on the hard part.",
  "Don't look at the counter. I've got it.",
  "Rep {reps}. Nothing to fix.",
  "Fine. Keep the pace.",
  "Nice and boring. That's what I want.",
];

export const MILESTONE_HALF: LineSpec[] = [
  L("Halfway on the last set. Finish it like you mean it.", (c) => c.isLastSet && c.setCount > 1, 1),
  "Halfway. The second half is where form goes. Don't let it.",
  "{remaining} left. Same speed as the first {reps}.",
  "Half. If that felt easy, the weight's wrong for next time.",
  "Halfway. Reset your brace before the next one.",
  "Half done. The bar hasn't noticed yet.",
];

export const MILESTONE_LAST3: LineSpec[] = [
  L("Three more and {exercise} is done for today.", (c) => c.isLastSet && c.setCount > 1, 1),
  L("Three. Then swap arms.", (c) => c.unilateral && c.side === "right", 1),
  "Three. Nothing fancy.",
  "Three to go. This is where I earn my keep.",
  "Three. Chest up.",
  "Three left. Same reps as the first three, please.",
  "Three. Don't speed up — that's a tell.",
];

export const MILESTONE_LAST1: LineSpec[] = [
  L("Last rep of the last set. Finish it properly.", (c) => c.isLastSet && c.setCount > 1, 1),
  L("One more, then the other arm.", (c) => c.unilateral && c.side === "right", 1),
  "Last one. Make it look like the first.",
  "One. Don't rush it.",
  "Final rep. Full range or it doesn't count.",
  "One more. Lock it out and hold it a beat.",
  "Last one. Everything you've got, none of it sloppy.",
];
