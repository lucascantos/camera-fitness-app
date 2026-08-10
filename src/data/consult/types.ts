// Shape of the initial consultation — the script's units and its result.

export type StepId = "goal" | "days" | "gear" | "space" | "level";

export interface Choice {
  id: string;
  /** Button text — what the athlete "says". */
  label: string;
  /** Second line under the label; the honest version of the answer. */
  blurb: string;
  /** Coach's reply once it's picked. This is what makes it a conversation. */
  react: string;
}

export interface Step {
  id: StepId;
  /** Short caption on the progress rail. */
  title: string;
  /** The coach's question. */
  ask: string;
  choices: Choice[];
}

export type ConsultAnswers = Partial<Record<StepId, string>>;

export interface ConsultProfile extends ConsultAnswers {
  /** ISO date the consultation was completed. */
  completedAt?: string;
}
