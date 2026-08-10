// The consultation script. Adding a question means adding a STEP here; the UI
// (src/components/Coach.tsx) renders whatever it finds.
//
// Design rules, from docs/coach-brainstorm.md:
//   - Every question must change an output. Nothing is collected "for later".
//   - No medical intake. We ask what you can *lift* and *where*, never about
//     conditions or injuries we can't responsibly act on.
//   - No promised timelines. Predictions the app can't keep cost the coach
//     its credibility on everything else.

import type { Step } from "./types";

/** Opening beats, before the first question. Tap to advance through them. */
export const OPENING: string[] = [
  "So the camera's the gym now, and I'm what passes for staff.",
  "Five questions. Then I build your plan and we stop talking about it.",
];

export const STEPS: Step[] = [
  {
    id: "goal",
    title: "Goal",
    ask: "First one. What are you actually here for?",
    choices: [
      {
        id: "strength",
        label: "Get strong",
        blurb: "Bigger numbers, fewer reps.",
        react: "Strength. Heavy sets, long rests, and more patience than you think you have.",
      },
      {
        id: "muscle",
        label: "Build muscle",
        blurb: "Size first, numbers second.",
        react: "Size. That means volume — more sets than feels interesting. It works anyway.",
      },
      {
        id: "fatloss",
        label: "Lean out",
        blurb: "Keep moving, keep the muscle.",
        react: "Lean. We keep lifting heavy while we do it — that's the part most people drop first.",
      },
      {
        id: "consistency",
        label: "Just show up",
        blurb: "Habit before heroics.",
        react: "Most honest answer on the list. It's also the hardest one, and it beats the rest long-term.",
      },
    ],
  },
  {
    id: "days",
    title: "Days",
    ask: "How many days a week can you actually give me? Not your best week — a normal one.",
    choices: [
      {
        id: "2",
        label: "Two",
        blurb: "Busy, but in.",
        react: "Two real days beats four imaginary ones. Full body, both days.",
      },
      {
        id: "3",
        label: "Three",
        blurb: "The reliable middle.",
        react: "Three. That's the sweet spot, and you picked it without me nudging.",
      },
      {
        id: "4",
        label: "Four",
        blurb: "This is a priority.",
        react: "Four. Now I can split it properly — upper, lower, and room to specialise.",
      },
      {
        id: "5",
        label: "Five or more",
        blurb: "Most days of the week.",
        react: "Five. I'll be watching your recovery closer than your lifts.",
      },
    ],
  },
  {
    id: "gear",
    title: "Gear",
    ask: "What have you got to lift? Be straight with me — I'd rather not write you a barbell you don't own.",
    choices: [
      {
        id: "none",
        label: "Just me",
        blurb: "Bodyweight only.",
        react: "Bodyweight. No shame in it, and the camera counts push-ups all day without complaining.",
      },
      {
        id: "dumbbells",
        label: "Dumbbells",
        blurb: "A pair, maybe adjustable.",
        react: "Dumbbells. That's most of a gym if you're clever about it.",
      },
      {
        id: "barbell",
        label: "Barbell and plates",
        blurb: "Rack, or straight off the floor.",
        react: "Barbell. Good — now there's something to actually load.",
      },
      {
        id: "gym",
        label: "Full gym",
        blurb: "Racks, machines, the lot.",
        react: "Full gym. Then the only thing missing was someone counting. That's me.",
      },
    ],
  },
  {
    id: "space",
    title: "Space",
    ask: "Practical one: I have to see all of you to count anything. How much room is there?",
    choices: [
      {
        id: "tight",
        label: "Tight",
        blurb: "A bedroom's worth, walls close.",
        react: "Tight. I'll keep you to lifts that stay inside the frame — and prop that phone high.",
      },
      {
        id: "clear",
        label: "Enough",
        blurb: "I can lie down and stretch out.",
        react: "That'll do for nearly everything.",
      },
      {
        id: "open",
        label: "Plenty",
        blurb: "Garage or gym floor, nothing close.",
        react: "Plenty of room. Nothing's off the table, then.",
      },
    ],
  },
  {
    id: "level",
    title: "Level",
    ask: "Last one. Where are you starting from?",
    choices: [
      {
        id: "new",
        label: "New to this",
        blurb: "Never really trained.",
        react: "New. Then we go slow and I explain things. Tell me when I'm overdoing the talking.",
      },
      {
        id: "returning",
        label: "Coming back",
        blurb: "Trained before. It's been a while.",
        react: "Coming back. Your body remembers more than you'd expect. Your ego remembers too much.",
      },
      {
        id: "trained",
        label: "Already training",
        blurb: "This is just a new tool.",
        react: "Trained. Then I'll talk less and count better.",
      },
    ],
  },
];

/** Coach's line on the summary screen, once every answer is in. */
export const CLOSING = "That's everything I need. Here's what I've got on you.";
