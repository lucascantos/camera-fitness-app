// Hints and tips for the rest screens: a form cue for the exercise coming up
// when we have one, otherwise a general tip. Cues are grouped by movement so
// the barbell and dumbbell versions of a lift share them.

const CUES: Record<string, string[]> = {
  squat: [
    "Push your knees out in line with your toes on the way down.",
    "Keep your whole foot on the floor, weight over the middle of it.",
    "Brace your stomach before each rep, as if you're about to be poked.",
  ],
  splitSquat: [
    "Drop the back knee straight down and keep the front heel planted.",
    "Keep your chest up and your weight on the front leg.",
  ],
  press: [
    "Squeeze your shoulder blades together and keep them pinned.",
    "Lower with control and touch the same spot every rep.",
  ],
  pushUp: [
    "Keep a straight line from head to heels; don't let your hips sag.",
    "Elbows at about 45° from your body, not flared straight out.",
  ],
  overhead: [
    "Squeeze your glutes so your lower back doesn't arch as you press.",
    "Once the weight passes your forehead, push your head through.",
  ],
  deadlift: [
    "Keep the weight close to your legs the whole way.",
    "Push the floor away with your legs; don't yank with your back.",
    "Hips and shoulders rise together.",
  ],
  row: [
    "Pull your elbows back toward your hips, not your hands to your chest.",
    "Keep your back flat and still; only the arms and shoulders move.",
  ],
  curl: [
    "Keep your elbows pinned at your sides.",
    "Lower slowly. The way down counts too.",
  ],
  raise: [
    "Lead with your elbows and stop at shoulder height.",
    "Go lighter and don't swing. Shoulders are small muscles.",
  ],
  triceps: ["Keep your upper arm still; only the forearm moves."],
  fly: ["Keep a slight bend in your elbows and open wide, like hugging a tree."],
};

const MOVEMENT: Record<string, keyof typeof CUES> = {
  "squat": "squat", "front squat": "squat", "dumbbell squat": "squat",
  "split squat": "splitSquat",
  "bench press": "press", "dumbbell press": "press",
  "push ups": "pushUp",
  "overhead press": "overhead", "dumbbell overhead press": "overhead",
  "deadlift": "deadlift", "dumbbell deadlift": "deadlift",
  "barbell row": "row", "dumbbell row": "row",
  "bicep curl": "curl", "hammer curl": "curl", "barbell curl": "curl",
  "lateral raise": "raise",
  "one arm triceps extension": "triceps", "skull crusher": "triceps",
  "dumbbell fly": "fly",
};

const GENERAL = [
  "Breathe out as you push, in as you lower.",
  "Sip some water while you rest.",
  "Keep your whole body in the camera frame so every rep counts.",
  "Rate every set honestly. It's how your next weights get set.",
  "Slow, controlled reps beat fast ones.",
  "Put the phone in the same spot every session for consistent counts.",
  "Shake out your arms and stay loose between sets.",
];

export interface Tip {
  /** The exercise the cue is for, or null for a general tip. */
  exercise: string | null;
  text: string;
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** A random tip: usually a form cue for `exercise`, sometimes a general one. */
export function tipFor(exercise: string | undefined): Tip {
  const cues = exercise ? CUES[MOVEMENT[exercise]] : undefined;
  if (cues && Math.random() < 0.7) return { exercise: exercise!, text: pick(cues) };
  return { exercise: null, text: pick(GENERAL) };
}
