// "Today's session": what the athlete is about to train, before any camera
// starts. Home's Start button opens this; the workout only begins from the
// Start button here. The session is prepared once on entry with the plan's
// progression, so the weights shown are exactly the ones the workout will use.

import { useEffect, useMemo } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { getStrategy } from "@/data/progressions";
import { MUSCLE_COLORS } from "@/data/exercises/catalog";
import { useSessionStore } from "@/stores/sessionStore";
import { BackIcon, PlayIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";
import { dayLabel, resolveActivePlan, resolveDayIndex } from "./home/activePlan";
import { describeLast, describeSets, sessionMuscles } from "./preview/describe";

export function SessionPreview() {
  const { goTo, startSession } = useSessionStore();

  const { plan, day, session } = useMemo(() => {
    const plan = resolveActivePlan();
    const dayIdx = resolveDayIndex(plan);
    const day = plan.workouts[dayIdx];
    const session = day
      ? getStrategy(plan.progression).prepareSession(plan, dayIdx, getAthlete())
      : null;
    return { plan, day, session };
  }, []);

  // Nothing to preview (no plan, or an empty day): back to Home.
  useEffect(() => { if (!session) goTo("home"); }, [session, goTo]);
  if (!day || !session) return null;

  const nSets = session.workouts.reduce((s, w) => s + w.sets.length, 0);
  const estMin = Math.max(1, Math.round(nSets * 1.5)); // ~90s per set
  const muscles = sessionMuscles(session.workouts.map((w) => w.exercise));

  return (
    <div className="h-full flex flex-col bg-bg animate-page-in">
      <header className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          onClick={() => goTo("home")}
          className="w-11 h-11 rounded-full bg-panel border border-border grid place-items-center text-ink shrink-0"
          aria-label="Back to home"
        >
          <BackIcon size={20} />
        </button>
        <span className="text-[11px] font-bold tracking-widest text-gray-dark">TODAY'S SESSION</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-5">
          <div>
            <h1 className="text-4xl font-extrabold text-ink leading-none">{dayLabel(day.name)}</h1>
            <div className="text-gray-dark font-semibold mt-2">
              {plan.name} · {session.workouts.length} exercises · {nSets} sets · ~{estMin} min
            </div>
            {muscles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {muscles.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1 rounded-full text-sm font-bold text-[#1A1330]"
                    style={{ background: MUSCLE_COLORS[m] }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ol className="flex flex-col gap-2">
            {session.workouts.map((w, i) => {
              const last = describeLast(w.exercise);
              return (
                <li
                  key={`${w.exercise}-${i}`}
                  className="bg-panel border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card"
                >
                  <span className="w-8 h-8 rounded-full bg-panel-dark grid place-items-center font-extrabold text-sm text-ink shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink truncate">{titleCase(w.exercise)}</div>
                    <div className="text-sm text-gray-dark">{describeSets(w.sets)}</div>
                  </div>
                  <div className={"text-xs font-semibold text-right shrink-0 " + (last ? "text-gray-dark" : "text-coin-dim")}>
                    {last ?? "★ First time"}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="px-4 pt-2 pb-4 shrink-0">
        <button
          onClick={() => startSession(session)}
          className="w-full max-w-lg mx-auto bg-accent text-on_accent font-extrabold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 active:bg-accent-hov transition"
        >
          <PlayIcon size={14} />
          Start workout
        </button>
      </div>
    </div>
  );
}
