// Full-screen editor for one logged workout: date, exercises, sets, reps and
// weight, all saved back to IndexedDB. An overlay rather than an inline swap
// so a long workout has the whole viewport to scroll in.

import { useState } from "react";
import {
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  type HistoryEntry,
} from "@/data/athlete/athlete";
import { TRACKED_EXERCISES } from "@/tracking/exercises/registry";
import { useDismissable } from "@/hooks/useDismissable";
import { BackIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";
import { ExerciseEditor } from "./ExerciseEditor";
import { formatDate, round } from "./helpers";

export function HistoryEditor({ index, initial, isNew, onClose, onChanged }: {
  index?: number;
  initial: HistoryEntry;
  isNew: boolean;
  onClose(): void;
  onChanged(): void;
}) {
  // Local editable copy — only written back on Save.
  const [draft, setDraft] = useState<HistoryEntry>(() => structuredClone(initial));
  const [newExercise, setNewExercise] = useState("");
  const [saving, setSaving] = useState(false);
  // Slides in like a pushed route; save/delete close through the same exit.
  const { closing, dismiss } = useDismissable(onClose, 200);

  function mutate(fn: (d: HistoryEntry) => void) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function addExercise() {
    const name = newExercise.trim().toLowerCase();
    if (!name) return;
    mutate((d) => { d.exercises.push({ exercise: name, sets: [{ reps: 10, weight: 0 }] }); });
    setNewExercise("");
  }

  // A workout needs at least one exercise carrying at least one set.
  const hasSets = draft.exercises.some((ex) => ex.sets.length > 0);

  async function save() {
    setSaving(true);
    // Drop any exercise left with no sets.
    const cleaned: HistoryEntry = structuredClone(draft);
    cleaned.exercises = cleaned.exercises.filter((ex) => ex.sets.length > 0);
    if (isNew) await addHistoryEntry(cleaned);
    else if (index != null) await updateHistoryEntry(index, cleaned);
    setSaving(false);
    onChanged();
    dismiss();
  }

  async function removeWorkout() {
    if (index == null) return;
    if (!confirm("Delete this entire workout? This can’t be undone.")) return;
    await deleteHistoryEntry(index);
    onChanged();
    dismiss();
  }

  return (
    <div
      className={
        "fixed inset-0 z-40 bg-bg flex flex-col safe-area " +
        (closing ? "animate-page-out" : "animate-page-in")
      }
    >
      <header className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          onClick={dismiss}
          className="w-11 h-11 rounded-full bg-panel border border-border grid place-items-center text-ink shrink-0"
          aria-label="Back to history"
        >
          <BackIcon size={20} />
        </button>
        <span className="flex-1 min-w-0 text-lg font-extrabold text-ink truncate">
          {isNew ? "New workout" : formatDate(draft.date)}
        </span>
        {!isNew && (
          <button
            onClick={removeWorkout}
            className="text-sm font-bold text-accent shrink-0 px-2 min-h-[44px]"
          >
            Delete
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-3">
          <div className="bg-panel rounded-2xl border border-border shadow-card p-4">
            <label className="block text-[10px] font-bold tracking-widest text-gray-dark mb-1">
              DATE
            </label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => mutate((d) => { d.date = e.target.value; })}
              className="w-full bg-transparent text-lg font-bold text-ink focus:outline-none"
            />
          </div>

          {draft.exercises.map((ex, exi) => (
            <ExerciseEditor
              key={exi}
              ex={ex}
              onSet={(si, field, v) =>
                mutate((d) => { d.exercises[exi].sets[si][field] = Math.max(0, v); })}
              // −/+ applies a delta against the *current* draft rather than a
              // value the stepper computed at render time: two taps batched
              // into one React update would otherwise both read the same stale
              // number and only advance once.
              onAdjust={(si, field, delta) =>
                mutate((d) => {
                  const set = d.exercises[exi].sets[si];
                  set[field] = round(set[field] + delta);
                })}
              onAddSet={() => mutate((d) => {
                const sets = d.exercises[exi].sets;
                const last = sets[sets.length - 1];
                sets.push(last ? { ...last } : { reps: 10, weight: 0 });
              })}
              onRemoveSet={(si) => mutate((d) => { d.exercises[exi].sets.splice(si, 1); })}
              onRemoveExercise={() => mutate((d) => { d.exercises.splice(exi, 1); })}
            />
          ))}
          {draft.exercises.length === 0 && (
            <div className="text-gray-dark text-sm px-1">
              No exercises yet — add one below.
            </div>
          )}

          <div className="flex gap-2">
            <input
              list="history-exercise-options"
              value={newExercise}
              placeholder="Add an exercise…"
              onChange={(e) => setNewExercise(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExercise(); } }}
              className="flex-1 min-w-0 bg-panel border border-border rounded-2xl px-4 py-3 text-ink font-semibold focus:outline-none focus:border-accent placeholder:text-gray-dark"
            />
            <datalist id="history-exercise-options">
              {TRACKED_EXERCISES.map((e) => (
                <option key={e} value={titleCase(e)} />
              ))}
            </datalist>
            <button
              onClick={addExercise}
              disabled={!newExercise.trim()}
              className="bg-panel border border-border text-ink font-bold px-5 min-h-[48px] rounded-2xl active:bg-panel-dark transition disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-4 bg-bg border-t border-border">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={save}
            disabled={saving || (isNew && !hasSets)}
            className="flex-[2] min-h-[56px] rounded-2xl font-bold bg-nav text-white active:bg-ink transition disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Add workout" : "Save changes"}
          </button>
          <button
            onClick={dismiss}
            className="flex-1 min-h-[56px] rounded-2xl font-bold bg-panel border border-border text-ink active:bg-panel-dark transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
