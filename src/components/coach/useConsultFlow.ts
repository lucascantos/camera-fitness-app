// The consultation's state machine: which beat is being spoken, what the
// coach says at it, and how a tap or a choice moves it along.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTypewriter } from "@/hooks/useTypewriter";
import {
  OPENING, STEPS, briefing, saveConsult,
  type Choice, type ConsultAnswers,
} from "@/data/consult/consult";

export type Phase =
  | { kind: "intro";  beat: number }
  | { kind: "ask";    step: number }
  | { kind: "react";  step: number; choice: Choice }
  | { kind: "brief";  beat: number }
  | { kind: "sheet" };

export function useConsultFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "intro", beat: 0 });
  const [answers, setAnswers] = useState<ConsultAnswers>({});

  // Built once the questions are done; stable for the whole briefing.
  const brief = useMemo(() => briefing(answers), [answers]);

  // The line currently being spoken.
  const line = useMemo(() => {
    switch (phase.kind) {
      case "intro":  return OPENING[phase.beat] ?? "";
      case "ask":    return STEPS[phase.step].ask;
      case "react":  return phase.choice.react;
      case "brief":  return brief[phase.beat] ?? "";
      case "sheet":  return "";
    }
  }, [phase, brief]);

  const { shown, done, skip } = useTypewriter(line);

  // Persist as soon as the last answer is in — the briefing and sheet are
  // read-only, so nothing after this point can change the profile.
  useEffect(() => {
    if (phase.kind === "brief" || phase.kind === "sheet") void saveConsult(answers);
  }, [phase.kind, answers]);

  /** Tap anywhere: finish the line, or move to the next beat. */
  const advance = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    setPhase((p) => {
      switch (p.kind) {
        case "intro":
          return p.beat + 1 < OPENING.length
            ? { kind: "intro", beat: p.beat + 1 }
            : { kind: "ask", step: 0 };
        case "ask":
          return p;               // waiting on a choice
        case "react":
          return p.step + 1 < STEPS.length
            ? { kind: "ask", step: p.step + 1 }
            : { kind: "brief", beat: 0 };
        case "brief":
          return p.beat + 1 < brief.length
            ? { kind: "brief", beat: p.beat + 1 }
            : { kind: "sheet" };
        case "sheet":
          return p;               // buttons take it from here
      }
    });
  }, [done, skip, brief.length]);

  const choose = (step: number, choice: Choice) => {
    setAnswers((a) => ({ ...a, [STEPS[step].id]: choice.id }));
    setPhase({ kind: "react", step, choice });
  };

  /** Step back one question, clearing the answer being reconsidered. */
  const back = () => {
    setPhase((p) => {
      if (p.kind !== "ask") return p;
      if (p.step === 0) return { kind: "intro", beat: OPENING.length - 1 };
      const prev = STEPS[p.step - 1];
      setAnswers((a) => {
        const next = { ...a };
        delete next[prev.id];
        return next;
      });
      return { kind: "ask", step: p.step - 1 };
    });
  };

  const restart = () => {
    setAnswers({});
    setPhase({ kind: "intro", beat: 0 });
  };

  // Progress rail: filled through the questions, complete during the briefing.
  const activeStep =
    phase.kind === "ask" || phase.kind === "react" ? phase.step
    : phase.kind === "brief" ? STEPS.length
    : -1;

  return { phase, answers, shown, done, activeStep, advance, choose, back, restart };
}
