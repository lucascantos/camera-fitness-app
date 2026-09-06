// Default trainer — replaces Ellie from the legacy repo.
// "Coach" — dry, plain-spoken, a little wry. Same voice as the consultation
// script (data/consult/script.ts): specific over enthusiastic, never a
// cheerleader, quietly on your side. The pools live in ./coach/*.ts; add
// more trainers by exporting another Trainer object from a sibling file.

import type { Trainer } from "./trainer";
import { GREETINGS } from "./coach/greetings";
import { INTRO_GENERIC, INTROS } from "./coach/intros";
import { MILESTONE_HALF, MILESTONE_LAST1, MILESTONE_LAST3, REPS } from "./coach/reps";
import { NEXT_EXERCISE, REST, SET_COMPLETE, SET_SHORT, SWITCH_SIDE } from "./coach/sets";
import { COMPLETE } from "./coach/complete";

export const coach: Trainer = {
  name: "Coach",
  tagline: "Dry, specific, quietly on your side.",
  // Rendered by components/trainer/CoachAvatar — no raster sprite needed.
  spritePath: "svg:coach",
  voiceDir: "/voice/coach",

  intros: INTROS,
  pools: {
    greeting:        GREETINGS,
    intro:           INTRO_GENERIC,
    rep:             REPS,
    milestone_half:  MILESTONE_HALF,
    milestone_last3: MILESTONE_LAST3,
    milestone_last1: MILESTONE_LAST1,
    set_complete:    SET_COMPLETE,
    set_short:       SET_SHORT,
    switch_side:     SWITCH_SIDE,
    rest:            REST,
    next_exercise:   NEXT_EXERCISE,
    complete:        COMPLETE,
  },
};
