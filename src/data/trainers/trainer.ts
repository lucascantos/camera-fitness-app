// Ported from: data/trainers.py (legacy FitnessApp repo)
// The Trainer SYSTEM only. Specific trainers live in sibling files.

export type LineCategory =
  | "greeting"
  | "intro"
  | "rep"
  | "milestone_half"
  | "milestone_last3"
  | "milestone_last1"
  | "set_complete"
  | "rest"
  | "complete";

export interface Trainer {
  name: string;
  spritePath: string;             // URL of the sprite asset
  voiceDir: string;               // base URL for voice clips (optional)
  greetings: string[];
  intros: Record<string, string[]>;
  reps: string[];
  milestoneHalf: string[];
  milestoneLast3: string[];
  milestoneLast1: string[];
  setComplete: string[];
  rests: string[];
  completes: string[];
}

function pickIndex(arr: string[]): number {
  return Math.floor(Math.random() * arr.length);
}

export interface SpokenLine {
  text: string;
  audio: string | null;
}

/**
 * Pick a random line from the requested category.
 * Audio URL is constructed deterministically but returned even if the file
 * doesn't exist — the audio layer is responsible for graceful fallback.
 */
export function line(
  t: Trainer,
  category: LineCategory,
  exercise?: string,
): SpokenLine {
  let pool: string[];
  if (category === "intro") {
    const exSlug = (exercise ?? "").replace(/\s+/g, "_");
    pool = t.intros[exercise ?? ""] ?? t.reps;
    if (pool.length === 0) return { text: "", audio: null };
    const idx = pickIndex(pool);
    return {
      text: pool[idx],
      audio: `${t.voiceDir}/intro/${exSlug}/${idx + 1}.mp3`,
    };
  }

  const map: Record<Exclude<LineCategory, "intro">, string[]> = {
    greeting: t.greetings,
    rep: t.reps,
    milestone_half: t.milestoneHalf,
    milestone_last3: t.milestoneLast3,
    milestone_last1: t.milestoneLast1,
    set_complete: t.setComplete,
    rest: t.rests,
    complete: t.completes,
  };
  pool = map[category];
  if (!pool || pool.length === 0) return { text: "", audio: null };
  const idx = pickIndex(pool);
  return {
    text: pool[idx],
    audio: `${t.voiceDir}/${category}/${idx + 1}.mp3`,
  };
}
