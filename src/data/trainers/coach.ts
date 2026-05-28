// Default trainer — replaces Ellie from the legacy repo.
// "Coach" — calm, focused, no-nonsense. Different voice from Ellie's
// upbeat-friend energy. Add more trainers by exporting another Trainer
// object from a sibling file.

import type { Trainer } from "./trainer";

export const coach: Trainer = {
  name: "Coach",
  spritePath: "",       // no sprite yet; component renders a placeholder
  voiceDir: "/voice/coach",

  greetings: [
    "Ready when you are.",
    "Let's get to work.",
    "Good. You showed up.",
    "Same as always — one set at a time.",
  ],

  intros: {
    "bicep curl": [
      "Bicep curls. Slow on the way down.",
      "Squeeze at the top. No swinging.",
    ],
    "squat": [
      "Squats. Knees track over toes.",
      "Sit back into it. Drive through the heels.",
    ],
    "push ups": [
      "Push-ups. Chest to floor, full lockout.",
      "Tight core the whole way.",
    ],
    "deadlift": [
      "Deadlift. Bar over mid-foot, neutral spine.",
      "Push the floor away.",
    ],
    "bench press": [
      "Bench press. Bar to chest, controlled.",
      "Drive your feet into the floor.",
    ],
    "overhead press": [
      "Overhead press. Brace your core, then go.",
      "Lock it out. Glutes tight.",
    ],
    "barbell row": [
      "Rows. Pull to your hip, squeeze.",
      "Stay tight in the hips.",
    ],
    "lateral raise": [
      "Lateral raise. Lead with the elbow.",
      "Slow. Control the weight.",
    ],
  },

  reps:           ["Good.", "Solid.", "Stay with it.", "Clean rep."],
  milestoneHalf:  ["Halfway.", "Stay on pace.", "Keep the form."],
  milestoneLast3: ["Three to go.", "Push.", "Finish strong."],
  milestoneLast1: ["Last one.", "Make it count.", "Finish."],
  setComplete:    ["Set done. Recover.", "Good set.", "Rest up."],
  rests:          ["Breathe.", "Hydrate.", "Reset.", "Stay loose."],
  completes:      ["Session done.", "Solid work today.", "That's the work. Recover."],
};
