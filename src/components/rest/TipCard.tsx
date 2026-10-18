// The hints-and-tips region on the rest screens. One tip per rest, picked on
// entry so it doesn't change under the athlete while they read it.

import { useMemo } from "react";
import { tipFor } from "@/data/tips";
import { titleCase } from "@/lib/format";

export function TipCard({ exercise }: { exercise: string | undefined }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tip = useMemo(() => tipFor(exercise), []);

  return (
    <div className="bg-panel-dark rounded-3xl px-5 py-4 flex gap-3 animate-fade-in">
      <div className="w-1 rounded-full bg-coin shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          {tip.exercise ? `TIP · ${titleCase(tip.exercise).toUpperCase()}` : "TIP"}
        </div>
        <p className="text-ink font-semibold mt-1 leading-snug">{tip.text}</p>
      </div>
    </div>
  );
}
