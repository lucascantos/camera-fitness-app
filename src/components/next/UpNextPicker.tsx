// The "Up next" card on the between-exercises screen. Swipe it to pick which
// of today's remaining exercises to do now (the others keep their order
// behind it), or open "Find alternatives" to swap the one shown for another
// exercise that works the same muscle. Changes apply to this session only.

import { useState } from "react";
import type { Session } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";
import { titleCase } from "@/lib/format";
import { Carousel, Dots } from "@/components/complete/Carousel";
import { AlternativesSheet } from "./AlternativesSheet";
import { setUpcoming, setsSummary, swapExercise, withChosenFirst } from "./upcoming";

export function UpNextPicker({ session, workoutIdx }: { session: Session; workoutIdx: number }) {
  // Snapshot of what's left, in its original order, taken on entry: the cards
  // stay put while swiping, and swiping back restores the original order.
  const [remaining, setRemaining] = useState(() => session.workouts.slice(workoutIdx));
  const [index, setIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const apply = (list: typeof remaining, chosen: number) => {
    setRemaining(list);
    setIndex(chosen);
    const current = useSessionStore.getState().session ?? session;
    useSessionStore.setState({ session: setUpcoming(current, workoutIdx, withChosenFirst(list, chosen)) });
  };

  const total = session.workouts.length;
  const shown = remaining[index];

  return (
    <div className="bg-panel rounded-3xl p-6 pb-3 border border-border shadow-card">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark">
        UP NEXT · {workoutIdx + 1} / {total}
      </div>

      {/* Only the exercise slides; the header above and the footer below stay
          put. gutter 0 = full-width pages with no peek. The Carousel bleeds
          16px past the content box (-mx-4), so each page pads it back in. */}
      <Carousel index={index} onIndex={(i) => apply(remaining, i)} gutter={0}>
        {remaining.map((w, i) => (
          <div key={`${w.exercise}-${i}`} className="px-4 pt-2">
            <div className="text-4xl font-black leading-none text-ink truncate">{titleCase(w.exercise)}</div>
            <div className="text-gray-dark text-lg mt-2">{setsSummary(w.sets)}</div>
          </div>
        ))}
      </Carousel>

      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="[&>div]:mt-0 [&>div]:justify-start">
          {remaining.length > 1 && (
            <Dots count={remaining.length} index={index} onIndex={(j) => apply(remaining, j)} />
          )}
        </div>
        <button
          onClick={() => setShowAlternatives(true)}
          className="shrink-0 text-sm font-bold text-accent min-h-[44px] -mr-2 px-2"
        >
          Find alternatives
        </button>
      </div>

      {showAlternatives && shown && (
        <AlternativesSheet
          exercise={shown.exercise}
          onClose={() => setShowAlternatives(false)}
          onPick={(name) => {
            apply(remaining.map((w, i) => (i === index ? swapExercise(w, name) : w)), index);
            setShowAlternatives(false);
          }}
        />
      )}
    </div>
  );
}
