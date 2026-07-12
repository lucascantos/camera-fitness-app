// Stats → History tab. Lists every workout the athlete has logged (newest
// first). You can add a workout by hand, or select one to edit the date,
// exercises, sets, reps and weight — all saved back to IndexedDB.

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

type View =
  | { kind: "list" }
  | { kind: "edit"; index: number }
  | { kind: "new" };

export function History() {
  // Bump to re-read the (mutated) athlete history after a save/delete.
  const [, force] = useState({});
  const [view, setView] = useState<View>({ kind: "list" });
  const history = getAthlete().history;

  if (view.kind === "new") {
    return (
      <HistoryEditor
        initial={blankEntry()}
        isNew
        onClose={() => setView({ kind: "list" })}
        onChanged={() => force({})}
      />
    );
  }
  if (view.kind === "edit" && history[view.index]) {
    return (
      <HistoryEditor
        index={view.index}
        initial={history[view.index]}
        isNew={false}
        onClose={() => setView({ kind: "list" })}
        onChanged={() => force({})}
      />
    );
  }

  // Chronological array → newest first, keeping the real index for editing.
  const rows = history
    .map((e, i) => ({ entry: e, index: i }))
    .reverse();

  return (
    <div className="px-8 pb-8 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-extrabold text-ink">History</h1>
        <button
          onClick={() => setView({ kind: "new" })}
          className="bg-accent text-on_accent font-bold py-2 px-5 rounded-2xl hover:bg-accent-hov transition"
        >
          + Add workout
        </button>
      </div>

      {rows.length === 0 && (
        <div className="bg-panel rounded-2xl border border-border shadow-card p-8 text-center text-gray-dark">
          No workouts logged yet. Finish a session or add one by hand.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map(({ entry, index }) => {
          const sets = entry.exercises.reduce((n, ex) => n + ex.sets.length, 0);
          return (
            <button
              key={index}
              onClick={() => setView({ kind: "edit", index })}
              className="bg-panel rounded-2xl border border-border shadow-card p-4 text-left hover:bg-panel-dark transition flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-bold text-ink">{formatDate(entry.date)}</div>
                <div className="text-sm text-gray-dark truncate">
                  {entry.exercises.map((ex) => titleCase(ex.exercise)).join(" · ") || "—"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-ink">{fmtVolume(entryVolume(entry))}</div>
                <div className="text-xs text-gray-dark">
                  {entry.exercises.length} ex · {sets} sets
                </div>
              </div>
            </button>
          );
        })}
      </div>
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
    onClose();
  }

  async function removeWorkout() {
    if (index == null) return;
    if (!confirm("Delete this entire workout? This can’t be undone.")) return;
    await deleteHistoryEntry(index);
    onChanged();
    onClose();
  }

  return (
    <div className="px-8 pb-8 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-panel border border-border grid place-items-center text-gray-dark hover:bg-panel-dark transition shrink-0"
            title="Back to history"
          >
            ‹
          </button>
          <h1 className="text-2xl font-extrabold text-ink truncate">
            {isNew ? "New workout" : formatDate(draft.date)}
          </h1>
        </div>
        {!isNew && (
          <button
            onClick={removeWorkout}
            className="text-sm font-semibold text-accent hover:underline shrink-0"
          >
            Delete workout
          </button>
        )}
      </div>

      {/* Date */}
      <div className="bg-panel rounded-2xl border border-border shadow-card p-4 mb-4">
        <label className="block text-[10px] font-bold tracking-widest text-gray-dark mb-1">
          DATE
        </label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => mutate((d) => { d.date = e.target.value; })}
          className="bg-panel-dark border border-border rounded-lg px-3 py-2 text-ink font-semibold focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-4">
        {draft.exercises.map((ex, exi) => (
          <ExerciseEditor
            key={exi}
            ex={ex}
            onSet={(si, field, v) => setSetValue(exi, si, field, v)}
            onAddSet={() => addSet(exi)}
            onRemoveSet={(si) => removeSet(exi, si)}
            onRemoveExercise={() => removeExercise(exi)}
          />
        ))}
        {draft.exercises.length === 0 && (
          <div className="text-gray-dark text-sm">
            No exercises yet — add one below.
          </div>
        )}
      </div>

      {/* Add exercise */}
      <div className="bg-panel rounded-2xl border border-dashed border-border p-4 mt-4 flex flex-wrap items-center gap-2">
        <input
          list="history-exercise-options"
          value={newExercise}
          placeholder="Add an exercise…"
          onChange={(e) => setNewExercise(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExercise(); } }}
          className="flex-1 min-w-[12rem] bg-panel-dark border border-border rounded-lg px-3 py-2 text-ink font-semibold focus:outline-none focus:border-accent"
        />
        <datalist id="history-exercise-options">
          {TRACKED_EXERCISES.map((e) => (
            <option key={e} value={titleCase(e)} />
          ))}
        </datalist>
        <button
          onClick={addExercise}
          disabled={!newExercise.trim()}
          className="bg-nav text-white font-bold py-2 px-4 rounded-xl hover:bg-ink transition disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={save}
          disabled={saving || (isNew && !hasSets)}
          className="bg-nav text-white font-bold py-3 px-6 rounded-2xl hover:bg-ink transition disabled:opacity-60"
        >
          {saving ? "Saving…" : isNew ? "Add workout" : "Save changes"}
        </button>
        <button
          onClick={onClose}
          className="bg-panel border border-border text-ink font-bold py-3 px-6 rounded-2xl hover:bg-panel-dark transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ExerciseEditor({ ex, onSet, onAddSet, onRemoveSet, onRemoveExercise }: {
  ex: HistoryExercise;
  onSet(si: number, field: "reps" | "weight", v: number): void;
  onAddSet(): void;
  onRemoveSet(si: number): void;
  onRemoveExercise(): void;
}) {
  return (
    <div className="bg-panel rounded-2xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-ink">{titleCase(ex.exercise)}</div>
        <button
          onClick={onRemoveExercise}
          className="text-xs font-semibold text-gray-dark hover:text-accent transition"
          title="Remove exercise"
        >
          Remove
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 text-[10px] font-bold tracking-widest text-gray-dark px-1 mb-1">
        <div>SET</div>
        <div>REPS</div>
        <div>WEIGHT (KG)</div>
        <div />
      </div>

      <div className="flex flex-col gap-2">
        {ex.sets.map((s, si) => (
          <div key={si} className="grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 items-center">
            <div className="text-sm font-bold text-gray-dark pl-1">{si + 1}</div>
            <NumberField
              value={s.reps}
              step={1}
              onChange={(v) => onSet(si, "reps", v)}
            />
            <NumberField
              value={s.weight}
              step={0.5}
              onChange={(v) => onSet(si, "weight", v)}
            />
            <button
              onClick={() => onRemoveSet(si)}
              className="w-8 h-8 rounded-lg bg-panel-dark text-gray-dark hover:text-accent hover:bg-bg transition grid place-items-center"
              title="Remove set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="mt-3 text-sm font-semibold text-accent hover:underline"
      >
        + Add set
      </button>
    </div>
  );
}

function NumberField({ value, step, onChange }: {
  value: number; step: number; onChange(v: number): void;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
      className="w-full bg-panel-dark border border-border rounded-lg px-3 py-2 text-ink font-semibold focus:outline-none focus:border-accent"
    />
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

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
