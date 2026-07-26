// Stats → History tab. Lists every workout the athlete has logged (newest
// first). You can add a workout by hand, or select one to edit the date,
// exercises, sets, reps and weight — all saved back to IndexedDB.
//
// Mobile-first: the list is a plain card stack, and the editor is a
// full-screen overlay (covering the bottom tab bar) rather than an inline
// swap, so a long workout has the whole viewport to scroll in.

import { useState } from "react";
import {
  getAthlete,
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  type HistoryEntry,
  type HistoryExercise,
} from "@/data/athlete/athlete";
import { TRACKED_EXERCISES } from "@/tracking/exercises/registry";
import { getSettings } from "@/data/settings/settings";
import { useDismissable } from "@/hooks/useDismissable";
import { BackIcon } from "@/components/icons";

type View =
  | { kind: "list" }
  | { kind: "edit"; index: number }
  | { kind: "new" };

export function History() {
  // Bump to re-read the (mutated) athlete history after a save/delete.
  const [, force] = useState({});
  const [view, setView] = useState<View>({ kind: "list" });
  const history = getAthlete().history;

  // Chronological array → newest first, keeping the real index for editing.
  const rows = history.map((e, i) => ({ entry: e, index: i })).reverse();

  const editing =
    view.kind === "new"
      ? { initial: blankEntry(), isNew: true, index: undefined }
      : view.kind === "edit" && history[view.index]
      ? { initial: history[view.index], isNew: false, index: view.index }
      : null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-ink">History</h1>
        <button
          onClick={() => setView({ kind: "new" })}
          className="bg-accent text-on_accent font-bold px-5 min-h-[44px] rounded-2xl active:bg-accent-hov transition"
        >
          + Add
        </button>
      </div>

      {rows.length === 0 && (
        <div className="bg-panel rounded-2xl border border-border shadow-card p-8 text-center text-gray-dark">
          No workouts logged yet. Finish a session or add one by hand.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ entry, index }) => {
          const sets = entry.exercises.reduce((n, ex) => n + ex.sets.length, 0);
          return (
            <button
              key={index}
              onClick={() => setView({ kind: "edit", index })}
              className="bg-panel rounded-2xl border border-border shadow-card px-4 py-3 text-left active:bg-panel-dark transition flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-ink truncate">{formatDate(entry.date)}</div>
                <div className="text-sm text-gray-dark truncate mt-0.5">
                  {entry.exercises.map((ex) => titleCase(ex.exercise)).join(" · ") || "—"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-ink">{fmtVolume(entryVolume(entry))}</div>
                <div className="text-xs text-gray-dark mt-0.5">
                  {entry.exercises.length} ex · {sets} sets
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {editing && (
        <HistoryEditor
          key={view.kind === "edit" ? view.index : "new"}
          index={editing.index}
          initial={editing.initial}
          isNew={editing.isNew}
          onClose={() => setView({ kind: "list" })}
          onChanged={() => force({})}
        />
      )}
    </div>
  );
}

// ── Detail / editor ────────────────────────────────────────────────────────

function HistoryEditor({ index, initial, isNew, onClose, onChanged }: {
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

  function setSetValue(exi: number, si: number, field: "reps" | "weight", value: number) {
    mutate((d) => { d.exercises[exi].sets[si][field] = Math.max(0, value); });
  }
  /**
   * −/+ applies a delta against the *current* draft rather than a value the
   * stepper computed at render time: two taps batched into one React update
   * would otherwise both read the same stale number and only advance once.
   */
  function adjustSetValue(exi: number, si: number, field: "reps" | "weight", delta: number) {
    mutate((d) => {
      const set = d.exercises[exi].sets[si];
      set[field] = round(set[field] + delta);
    });
  }
  function addSet(exi: number) {
    mutate((d) => {
      const sets = d.exercises[exi].sets;
      const last = sets[sets.length - 1];
      sets.push(last ? { ...last } : { reps: 10, weight: 0 });
    });
  }
  function removeSet(exi: number, si: number) {
    mutate((d) => { d.exercises[exi].sets.splice(si, 1); });
  }
  function removeExercise(exi: number) {
    mutate((d) => { d.exercises.splice(exi, 1); });
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
    if (isNew) {
      await addHistoryEntry(cleaned);
    } else if (index != null) {
      await updateHistoryEntry(index, cleaned);
    }
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
      {/* Header — back · date · delete */}
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

      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-3">
          {/* Date */}
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
              onSet={(si, field, v) => setSetValue(exi, si, field, v)}
              onAdjust={(si, field, d) => adjustSetValue(exi, si, field, d)}
              onAddSet={() => addSet(exi)}
              onRemoveSet={(si) => removeSet(exi, si)}
              onRemoveExercise={() => removeExercise(exi)}
            />
          ))}
          {draft.exercises.length === 0 && (
            <div className="text-gray-dark text-sm px-1">
              No exercises yet — add one below.
            </div>
          )}

          {/* Add exercise */}
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

      {/* Sticky footer */}
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

function ExerciseEditor({ ex, onSet, onAdjust, onAddSet, onRemoveSet, onRemoveExercise }: {
  ex: HistoryExercise;
  onSet(si: number, field: "reps" | "weight", v: number): void;
  onAdjust(si: number, field: "reps" | "weight", delta: number): void;
  onAddSet(): void;
  onRemoveSet(si: number): void;
  onRemoveExercise(): void;
}) {
  // Weight increments follow the same Settings › weight step the training
  // screen uses, so editing history feels like logging a live set.
  const weightStep = getSettings().weightStep;

  return (
    <div className="bg-panel rounded-2xl border border-border shadow-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-ink truncate">{titleCase(ex.exercise)}</div>
        <button
          onClick={onRemoveExercise}
          className="text-xs font-semibold text-gray-dark active:text-accent transition shrink-0 px-1"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {ex.sets.map((s, si) => (
          <div key={si} className="flex items-center gap-1.5">
            <span className="w-4 text-sm font-bold text-gray-dark shrink-0">{si + 1}</span>
            <Stepper
              value={s.reps}
              unit="reps"
              step={1}
              onAdjustBy={(d) => onAdjust(si, "reps", d)}
              onSet={(v) => onSet(si, "reps", v)}
            />
            <Stepper
              value={s.weight}
              unit="kg"
              step={weightStep}
              onAdjustBy={(d) => onAdjust(si, "weight", d)}
              onSet={(v) => onSet(si, "weight", v)}
            />
            <button
              onClick={() => onRemoveSet(si)}
              className="w-7 h-7 rounded-full text-gray-dark active:text-accent transition grid place-items-center shrink-0"
              aria-label={`Remove set ${si + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="mt-2 text-sm font-bold text-accent px-1 min-h-[36px]"
      >
        + Add set
      </button>
    </div>
  );
}

/**
 * Compact −/+ control with a directly editable value. Two of these plus a
 * remove button have to share a 375px row, so the buttons run 36px rather
 * than the usual 44px minimum; the number itself stays typeable so large
 * jumps (0 → 80kg) don't mean eighty taps.
 */
function Stepper({ value, unit, step, onAdjustBy, onSet }: {
  value: number; unit: string; step: number;
  onAdjustBy(delta: number): void;
  onSet(v: number): void;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center justify-between bg-panel-dark rounded-full p-1">
      <button
        onClick={() => onAdjustBy(-step)}
        className="w-9 h-9 rounded-full bg-panel text-ink text-lg grid place-items-center shrink-0"
        aria-label={`Decrease ${unit}`}
      >
        −
      </button>
      <span className="flex items-baseline justify-center min-w-0 px-0.5">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onSet(Number.isFinite(v) ? Math.max(0, v) : 0);
          }}
          className="w-8 bg-transparent text-center font-bold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={unit}
        />
        <span className="text-[10px] text-gray-dark shrink-0">{unit}</span>
      </span>
      <button
        onClick={() => onAdjustBy(step)}
        className="w-9 h-9 rounded-full bg-nav text-white text-lg grid place-items-center shrink-0"
        aria-label={`Increase ${unit}`}
      >
        +
      </button>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Keep 0.5kg steps from accumulating float noise (0.30000000000000004). */
function round(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}

function blankEntry(): HistoryEntry {
  return {
    date: new Date().toISOString().slice(0, 10),
    exercises: [],
    coinsEarned: 0,
  };
}

function entryVolume(e: HistoryEntry): number {
  return e.exercises.reduce(
    (vol, ex) => vol + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  );
}

function fmtVolume(kg: number): string {
  if (kg <= 0) return "0 kg";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Parse a YYYY-MM-DD string without timezone drift and format it nicely.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}
