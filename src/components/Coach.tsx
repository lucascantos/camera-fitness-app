// Initial consultation — the coach's opening conversation.
//
// Deliberately shaped like a game's intro rather than a form: full-screen
// takeover, the coach types one line at a time, and every answer is a spoken
// reply the coach reacts to before moving on. The point is that it reads as
// *meeting someone*, not filling in a profile — a questionnaire in front of
// someone who came to train is the highest-friction screen in the app, so it
// had better be the most characterful one.
//
// Script and persistence live in src/data/consult/; the state machine is in
// ./coach/useConsultFlow. This file is only the staging.
//
// ── Why the layout is pinned the way it is ────────────────────────────────
// The typewriter re-renders this component up to ~40×/second, and the text it
// produces reflows as it grows. The first version let the portrait sit in a
// flex-1 box above the dialogue, so every reflow resized the stage and the
// coach visibly jittered on every line. Three rules keep it still:
//
//   1. The stage has a FIXED height. It never reacts to the text below it.
//   2. The portrait is memoised, so typing a character doesn't re-render a
//      200-node SVG.
//   3. Nothing about the portrait is keyed to the dialogue. The "talking"
//      halo toggled once per line, which read as a flash; the coach now just
//      breathes on a constant loop instead.
//
// Tap anywhere to advance (or to skip a line mid-type) — the visual-novel
// contract. Choice buttons stop propagation so a pick never double-advances.

import { memo } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { CoachAvatar } from "@/components/trainer/CoachAvatar";
import { STEPS } from "@/data/consult/consult";
import { Sheet } from "./coach/Sheet";
import { useConsultFlow } from "./coach/useConsultFlow";

/** Static portrait. Memoised with no props, so the typewriter can't touch it. */
const Portrait = memo(function Portrait() {
  return (
    <div className="h-full animate-breathe [&_svg]:h-full [&_svg]:w-auto">
      <CoachAvatar orientation="portrait" size={320} />
    </div>
  );
});

export function Coach() {
  const { goTo } = useSessionStore();
  const flow = useConsultFlow();
  const { phase, shown, done } = flow;

  if (phase.kind === "sheet") {
    return (
      <Sheet answers={flow.answers} onDone={() => goTo("home")} onRedo={flow.restart} />
    );
  }

  const showChoices = phase.kind === "ask" && done;

  return (
    <div
      onClick={flow.advance}
      className="h-full flex flex-col bg-nav text-white select-none overflow-hidden"
    >
      {/* ── Top rail: progress + exit ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-3 h-12 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); flow.back(); }}
          disabled={phase.kind !== "ask"}
          className="text-white/60 text-2xl leading-none w-8 h-8 -ml-1 grid place-items-center active:text-white disabled:opacity-0"
          aria-label="Previous question"
        >
          ‹
        </button>
        <div className="flex-1 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={
                "h-1 flex-1 rounded-full transition-colors duration-300 " +
                (i < flow.activeStep ? "bg-accent"
                 : i === flow.activeStep ? "bg-white"
                 : "bg-white/20")
              }
            />
          ))}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); goTo("home"); }}
          className="text-white/60 text-xs font-bold tracking-widest active:text-white"
        >
          SKIP
        </button>
      </div>

      {/* ── Stage ─────────────────────────────────────────────────────────
          Fixed height, and it comes BEFORE the text in the flex column with
          no flex-grow. Nothing the dialogue does can move it. */}
      <div className="h-[38vh] max-h-[320px] min-h-[180px] shrink-0 grid place-items-center py-2">
        <Portrait />
      </div>

      {/* ── Dialogue box ──────────────────────────────────────────────────
          min-h holds four lines at the narrowest supported width, so almost
          every line renders without the box changing size at all. */}
      <div className="shrink-0 px-4">
        <div className="bg-panel text-ink rounded-3xl px-5 py-4 border border-border shadow-card">
          <div className="text-[11px] font-bold tracking-widest text-accent">
            COACH
          </div>
          <p className="mt-1.5 text-[17px] leading-snug min-h-[5.25rem]">
            {shown}
          </p>
        </div>
      </div>

      {/* ── Choices / continue hint ───────────────────────────────────────
          flex-1 absorbs any leftover height, so growth here never pushes the
          stage. Scrolls internally if a question ever outgrows the space. */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pt-3 pb-4">
        {showChoices ? (
          <div className="flex flex-col gap-2 animate-fade-in">
            {STEPS[phase.step].choices.map((c) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); flow.choose(phase.step, c); }}
                className="w-full text-left bg-white/10 border border-white/20 rounded-2xl px-4 py-3 min-h-[56px] active:bg-white/20 transition"
              >
                <div className="font-bold text-white">{c.label}</div>
                <div className="text-sm text-white/60">{c.blurb}</div>
              </button>
            ))}
          </div>
        ) : (
          // Centred in the space the choices would have occupied. The gap is
          // held open deliberately rather than closed, because collapsing it
          // would resize the stage and move the coach between phases.
          done && (
            <div className="h-full grid place-items-center animate-fade-in">
              <span className="text-xs tracking-widest text-white/35">
                TAP TO CONTINUE
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
