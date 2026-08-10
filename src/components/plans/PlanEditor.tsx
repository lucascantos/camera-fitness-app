// Plan editor — a full-screen overlay with its own back header, so it covers
// the bottom tab bar the way a pushed route would. It's an overlay rather than
// a scene because the app has no router; this matches how QuickSettings and
// the exercise picker already work.

import { DEFAULT_PLANS, type Plan, type ProgressionId } from "@/data/plans/plans";
import { getStrategy } from "@/data/progressions";
import { useDismissable } from "@/hooks/useDismissable";
import { BackIcon, PlayIcon } from "@/components/icons";
import { ExerciseCard } from "./ExerciseCard";
import { DaysRow, Field } from "./EditorFields";

const PROGRESSIONS: { id: ProgressionId; label: string }[] = [
  { id: "linear",         label: "Linear" },
  { id: "five_three_one", label: "5/3/1"  },
  { id: "volume",         label: "Volume" },
];

export interface EditorProps {
  draft: Plan;
  isNew: boolean;
  activeDayIdx: number;
  isActive: boolean;
  dirty: boolean;
  /** Runs the unsaved-changes guard; false aborts the dismissal. */
  canClose(): boolean;
  onClose(): void;
  onPatchDraft(p: Partial<Plan>): void;
  onSelectDay(i: number): void;
  onAddDay(): void;
  onDeleteDay(i: number): void;
  onAddExercise(): void;
  onRemoveExercise(i: number): void;
  onAdjustSets(i: number, d: number): void;
  onAdjustReps(i: number, d: number): void;
  onMarkActive(): void;
  onStartDay(): void;
  onSave(): void;
  onDelete(): void;
}

export function PlanEditor(p: EditorProps) {
  const day = p.draft.workouts[p.activeDayIdx];
  const totalSets = day?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0;
  const estMin = Math.max(1, Math.round(totalSets * 1.5));
  const managed = getStrategy(p.draft.progression).managedExercises?.(p.draft)
    ?? new Set<string>();
  const isDefault = DEFAULT_PLANS.some((dp) => dp.id === p.draft.id);
  // Slides in like a pushed route. The unsaved-changes confirm runs inside
  // onClose, so a cancelled dismissal would still have played the exit —
  // hence the guard is checked before dismiss() is called.
  const { closing, dismiss } = useDismissable(p.onClose, 200);
  const close = () => { if (p.canClose()) dismiss(); };

  return (
    <div
      className={
        "fixed inset-0 z-40 bg-bg flex flex-col safe-area " +
        (closing ? "animate-page-out" : "animate-page-in")
      }
    >
      <header className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          onClick={close}
          className="w-11 h-11 rounded-full bg-panel border border-border grid place-items-center text-ink shrink-0"
          aria-label="Back to plans"
        >
          <BackIcon size={20} />
        </button>
        <span className="text-lg font-extrabold text-ink truncate">
          {p.isNew ? "New Plan" : "Edit Plan"}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-5">
          <Field label="PLAN NAME">
            <input
              value={p.draft.name}
              onChange={(e) => p.onPatchDraft({ name: e.target.value })}
              placeholder="Untitled Plan"
              className="w-full text-xl font-bold text-ink bg-panel rounded-2xl px-4 py-3.5 border border-border focus:outline-none focus:border-accent placeholder:text-gray"
            />
          </Field>

          {/* Progression — equal-width segmented control */}
          <Field label="PROGRESSION">
            <div className="flex gap-2">
              {PROGRESSIONS.map((pr) => (
                <button
                  key={pr.id}
                  onClick={() => p.onPatchDraft({ progression: pr.id })}
                  className={
                    "flex-1 min-h-[44px] rounded-2xl font-bold text-sm transition " +
                    (p.draft.progression === pr.id
                      ? "bg-nav text-white"
                      : "bg-panel text-ink border border-border")
                  }
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="DAYS"
            aside={`${day?.exercises.length ?? 0} exercises · ~${estMin} min`}
          >
            <DaysRow
              workouts={p.draft.workouts}
              activeIdx={p.activeDayIdx}
              onSelect={p.onSelectDay}
              onAdd={p.onAddDay}
              onDelete={p.onDeleteDay}
            />
          </Field>

          <Field label={`EXERCISES · DAY ${day?.name ?? "—"}`}>
            <div className="flex flex-col gap-3">
              {day?.exercises.map((e, i) => (
                <ExerciseCard
                  key={`${e.exercise}-${i}`}
                  index={i}
                  ex={e}
                  autoManaged={managed.has(e.exercise)}
                  onRemove={() => p.onRemoveExercise(i)}
                  onSets={(d) => p.onAdjustSets(i, d)}
                  onReps={(d) => p.onAdjustReps(i, d)}
                />
              ))}
              <button
                onClick={p.onAddExercise}
                className="border-2 border-dashed border-border text-gray-dark font-bold min-h-[52px] rounded-2xl active:bg-panel-dark transition"
              >
                + Add exercise
              </button>
            </div>
          </Field>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={p.onMarkActive}
              disabled={p.isActive}
              className={
                "min-h-[48px] rounded-2xl font-bold border transition " +
                (p.isActive
                  ? "bg-good/15 text-good border-transparent cursor-default"
                  : "bg-panel text-ink border-border active:bg-panel-dark")
              }
            >
              {p.isActive ? "✓ Active plan" : "Set as active"}
            </button>
            <button
              onClick={p.onStartDay}
              disabled={!day || day.exercises.length === 0}
              className="min-h-[48px] rounded-2xl font-bold bg-panel text-ink border border-border active:bg-panel-dark transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlayIcon size={12} />
              Start Day {day?.name ?? ""}
            </button>
            <button
              onClick={p.onDelete}
              disabled={isDefault}
              className="min-h-[48px] rounded-2xl font-bold text-accent active:bg-accent/5 transition disabled:opacity-40"
            >
              {isDefault ? "Built-in plan" : "Delete plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer — the one primary action */}
      <div className="shrink-0 px-4 pt-2 pb-4 bg-bg border-t border-border">
        <div className="max-w-lg mx-auto">
          <button
            onClick={p.onSave}
            className="w-full min-h-[56px] rounded-2xl font-bold text-lg bg-accent text-white active:bg-accent-hov transition"
          >
            {p.dirty ? "Save plan" : "Saved"}
          </button>
        </div>
      </div>
    </div>
  );
}
