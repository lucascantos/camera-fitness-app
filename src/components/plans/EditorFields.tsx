// Layout pieces of the plan editor body.

import type { Plan } from "@/data/plans/plans";

/** Eyebrow-labelled block, with an optional right-aligned summary. */
export function Field({ label, aside, children }: {
  label: string; aside?: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span className="text-[11px] font-bold tracking-widest text-gray-dark">
          {label}
        </span>
        {aside && <span className="text-xs text-gray-dark">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** The day selector: one pill per day, plus add and remove. */
export function DaysRow({ workouts, activeIdx, onSelect, onAdd, onDelete }: {
  workouts: Plan["workouts"];
  activeIdx: number;
  onSelect(i: number): void;
  onAdd(): void;
  onDelete(i: number): void;
}) {
  return (
    <div className="flex gap-2 items-center flex-wrap">
      {workouts.map((d, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={
            "w-11 h-11 rounded-full font-bold transition " +
            (i === activeIdx
              ? "bg-accent text-white"
              : "bg-panel text-gray-dark border border-border")
          }
        >
          {d.name}
        </button>
      ))}
      <button
        onClick={onAdd}
        className="w-11 h-11 rounded-full bg-panel text-gray-dark border border-border text-xl"
        aria-label="Add day"
      >
        +
      </button>
      {workouts.length > 1 && (
        <button
          onClick={() => onDelete(activeIdx)}
          className="w-11 h-11 rounded-full bg-panel text-gray-dark border border-border text-xl"
          aria-label="Remove this day"
        >
          ×
        </button>
      )}
    </div>
  );
}
