// What the answers actually change — the derived programme, and the coach's
// spoken explanation of it.

import type { ProgressionId } from "@/data/progressions";
import { STEPS } from "./script";
import type { ConsultAnswers, StepId } from "./types";

/** Goal → the progression strategy that already exists in src/data/progressions. */
export function progressionFor(answers: ConsultAnswers): ProgressionId {
  switch (answers.goal) {
    case "strength":    return "five_three_one";
    case "muscle":      return "volume";
    case "fatloss":     return "volume";
    default:            return "linear";
  }
}

/** Human label for a chosen option, for the summary card. */
export function labelFor(stepId: StepId, choiceId: string | undefined): string {
  if (!choiceId) return "—";
  const step = STEPS.find((s) => s.id === stepId);
  return step?.choices.find((c) => c.id === choiceId)?.label ?? "—";
}

/**
 * The coach's spoken explanation of the programme, one beat per tap.
 *
 * This replaced a bullet list of "what this changes". Same information, but a
 * coach that hands you a spec sheet isn't a coach — the whole consultation is
 * a conversation, and the payoff shouldn't be the one part that stops being
 * one. Keep each line under ~140 characters so the dialogue box doesn't have
 * to grow to hold it.
 */
export function briefing(a: ConsultAnswers): string[] {
  const out: string[] = ["Alright. Here's your plan."];

  switch (a.days) {
    case "2":
      out.push("Two days a week, full body both times. Everything gets trained twice — that's plenty to move forward on.");
      break;
    case "3":
      out.push("Three days a week, full body each time. Every lift gets three shots a week instead of one.");
      break;
    case "4":
      out.push("Four days, split upper and lower. Two of each, so nothing waits a whole week for its turn.");
      break;
    case "5":
      out.push("Five days, split fine. At that frequency I'll be watching your recovery more closely than your lifts.");
      break;
  }

  switch (progressionFor(a)) {
    case "five_three_one":
      out.push("Progression is 5/3/1 — one heavy top set, then back-off work. The jumps are small on purpose. It'll feel too easy for a month, then it won't.");
      break;
    case "volume":
      out.push(
        a.goal === "fatloss"
          ? "Progression is volume — weight stays respectable, sets keep moving. That's how the muscle stays while the rest comes off."
          : "Progression is volume — more sets than feels interesting. Boring on paper. It's also the thing that actually builds size.",
      );
      break;
    default:
      out.push("Progression is linear — a little more weight each session, for as long as that keeps working. It works longer than people expect.");
  }

  switch (a.gear) {
    case "none":
      out.push("No kit, so it's bodyweight. Push-ups, squats, holds — and the camera reads those better than anything else anyway.");
      break;
    case "dumbbells":
      out.push("Dumbbells only, so we work one side at a time and lean on rep quality. You'll get further with them than you'd think.");
      break;
    case "barbell":
      out.push("You've got a barbell, so squats, presses and pulls carry the programme. Everything else is support.");
      break;
    case "gym":
      out.push("Full gym, so nothing's off the table. Main lifts stay central, the machines fill in around them.");
      break;
  }

  if (a.space === "tight") {
    out.push("Space is tight, so I'll skip the wide movements. Prop the phone high and stand as far back as the room allows.");
  }

  switch (a.level) {
    case "new":
      out.push("You're new, so we start light and I talk you through the form. Tell me when I'm over-explaining.");
      break;
    case "returning":
      out.push("You've done this before, so your body will catch up faster than your patience will. I'm still starting you light.");
      break;
    case "trained":
      out.push("You know what you're doing, so I'll stay out of the way and just count.");
      break;
  }

  out.push("That's the plan. Camera on whenever you're ready.");
  return out;
}
