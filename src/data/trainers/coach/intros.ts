// Coach — exercise intros. Spoken when a set is about to start. Weight-aware
// lines sit in the shared pool and outrank the per-exercise cues whenever
// the weight is new or a personal best; the exercise cues fill the rest.

import { L, type LineSpec } from "../trainer";

/** Cross-exercise intros, checked first. */
export const INTRO_GENERIC: LineSpec[] = [
  L("{weight}. Heavier than you've ever done on {exercise}. Brace, and don't rush the first rep.",
    (c) => c.isPrWeight && c.isFirstSet, 3),
  L("Up from last time. Same form, more patience.",
    (c) => c.isNewWeight && c.isFirstSet, 2),
  L("Last set of {exercise}. Make it look like the first one.",
    (c) => c.isLastSet && c.setCount > 1, 2),
  L("Set {set} of {sets}. Nothing new, just again.",
    (c) => !c.isFirstSet && !c.isLastSet, 1),
  L("Right arm first. I'll tell you when to swap.",
    (c) => c.unilateral && c.isFirstSet, 2),
  L("AMRAP. As many as you can with form I'd sign off on. Then stop.",
    (c) => c.amrap && c.isFirstSet, 2),
  "{exercise}. You know the drill.",
  "{exercise}. Get set. I'll start counting when you do.",
];

export const INTROS: Record<string, LineSpec[]> = {
  "bicep curl": [
    "Curls. Slow on the way down — that half is where the arm grows.",
    "Elbows pinned to your ribs. If they drift forward, it's a shoulder exercise.",
    "Squeeze at the top. No swinging — the hips aren't invited.",
    "Full range. All the way down, all the way up. Half reps get half a count from me.",
  ],
  "squat": [
    "Squats. Knees out, chest up, sit between your heels.",
    "Big breath at the top, hold it down and up. Then breathe.",
    "Drive through the whole foot. Toes stay down.",
    "Depth first, weight second. I'm watching the knee angle, not the plates.",
  ],
  "push ups": [
    "Push-ups. Chest to the floor, full lockout. Body in one line.",
    "Squeeze your glutes — a sagging hip is the first thing I'll see.",
    "Hands under shoulders. Elbows at forty-five, not flared to the walls.",
    "Slow down. Fast push-ups count for the ego, not the chest.",
  ],
  "deadlift": [
    "Deadlift. Bar over mid-foot, neutral spine, then push the floor away.",
    "Pull the slack out before you pull the bar. Two separate things.",
    "Lats tight, bar close. If it drifts forward, your back pays for it.",
    "Stand up. That's the whole cue. Everything else is bracing.",
  ],
  "bench press": [
    "Bench. Feet planted, shoulder blades pinned, bar to the chest under control.",
    "Touch, don't bounce. The chest is not a trampoline.",
    "Drive your feet into the floor. Leg drive is legal — use it.",
    "Wrists straight over elbows. Bend them and the bar wanders.",
  ],
  "overhead press": [
    "Overhead press. Brace like someone's about to poke you in the stomach.",
    "Squeeze the glutes — no back-bend. This is a shoulder lift, not a hip lift.",
    "Head through at the top. Lock it out over the middle of your foot.",
    "Bar starts on the collarbones. Elbows slightly in front, then straight up.",
  ],
  "barbell row": [
    "Rows. Hinge, hold the hinge, pull to the hip.",
    "Squeeze the shoulder blades together at the top. Then let them go slowly.",
    "If the torso swings, the weight's too heavy. Nobody's checking except me.",
    "Elbows drive back, not out. It's a back exercise, not a shrug.",
  ],
  "lateral raise": [
    "Lateral raise. Lead with the elbows, thumbs slightly down.",
    "Light weight, slow reps. This one punishes ego faster than any other.",
    "Stop at shoulder height. Higher than that and the traps take over.",
    "Two seconds down. The lowering is the exercise.",
  ],
  "one arm triceps extension": [
    "One-arm triceps. Elbow points at the ceiling and stays there. It will try to drift.",
    "Only the forearm moves. If the upper arm swings, that's momentum, not triceps.",
    "Full lockout at the top, full stretch at the bottom. Small muscle, honest range.",
    "Light and slow. This is precision work, not a strength test.",
  ],
};
