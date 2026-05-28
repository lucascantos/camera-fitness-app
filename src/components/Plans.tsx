// Ported from: scenes/workout_plans.py (legacy FitnessApp repo)
// Plan list (left) + plan editor (right).

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLANS,
  deletePlan as deletePlanData,
  loadPlans,
  makeSession,
  newPlan as newPlanData,
  nextDayName,
  savePlans,
  setActivePlan,
  type Plan,
  type PrescribedSet,
  type ProgressionId,
  type WorkoutDay,
  type WorkoutExercise,
} from "@/data/plans/plans";
import { getSettings } from "@/data/settings/settings";
import {
  EXERCISE_CATALOG,
  exerciseMeta,
  isTracked,
  MUSCLE_COLORS,
} from "@/data/exercises/catalog";
import { useSessionStore } from "@/stores/sessionStore";

const PROGRESSIONS: { id: ProgressionId; label: string }[] = [
  { id: "linear",         label: "Linear" },
  { id: "five_three_one", label: "5/3/1"  },
  { id: "volume",         label: "Volume" },
];

const PROGRESSION_LABEL: Record<ProgressionId, string> = {
  linear: "Linear",
  five_three_one: "5/3/1",
  volume: "Volume",
};

// ──────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────

export function Plans() {
  const { startSession } = useSessionStore();
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [draft, setDraft]           = useState<Plan | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId]     = useState<string | null>(getSettings().activePlanId);

  // Initial load
  useEffect(() => {
    (async () => {
      const all = await loadPlans();
      setPlans(all);
      const initial = all.find((p) => p.id === activeId) ?? all[0];
      if (initial) {
        setSelectedId(initial.id);
        setDraft(structuredClone(initial));
      }
    })();
  }, []); // eslint-disable-line

  // Dirty flag — true when the editor has unsaved changes.
  const original = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId],
  );
  const dirty = useMemo(
    () => draft != null && original != null
      && JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  );

  // ── plan list actions ────────────────────────────────────────────────
  const selectPlan = (id: string) => {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setDraft(structuredClone(p));
    setActiveDayIdx(0);
  };

  const createNew = async () => {
    const p = await newPlanData("New plan");
    const all = (await loadPlans()).slice();
    setPlans(all);
    setSelectedId(p.id);
    setDraft(structuredClone(p));
    setActiveDayIdx(0);
  };

  const deleteCurrent = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this plan?")) return;
    const next = await deletePlanData(selectedId);
    setPlans(next);
    const fallback = next[0] ?? null;
    setSelectedId(fallback?.id ?? null);
    setDraft(fallback ? structuredClone(fallback) : null);
    setActiveDayIdx(0);
    setActiveId(getSettings().activePlanId);
  };

  const saveCurrent = async () => {
    if (!draft) return;
    const next = plans.map((p) => (p.id === draft.id ? draft : p));
    await savePlans(next);
    setPlans(next);
  };

  const markActive = async () => {
    if (!draft) return;
    await setActivePlan(draft.id);
    setActiveId(draft.id);
  };

  const startDay = () => {
    if (!draft || !draft.workouts[activeDayIdx]) return;
    const day = draft.workouts[activeDayIdx];
    const s = makeSession(
      day.name,
      day.exercises.map((e) => [e.exercise, e.sets] as [string, PrescribedSet[]]),
      { planId: draft.id, workoutDayIndex: activeDayIdx },
    );
    startSession(s);
  };

  // ── draft mutators ───────────────────────────────────────────────────
  const patchDraft = (p: Partial<Plan>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const patchDay = (idx: number, p: Partial<WorkoutDay>) =>
    setDraft((d) => {
      if (!d) return d;
      const workouts = d.workouts.slice();
      workouts[idx] = { ...workouts[idx], ...p };
      return { ...d, workouts };
    });

  const addDay = () => {
    if (!draft) return;
    const name = nextDayName(draft.workouts);
    const workouts = [...draft.workouts, { name, exercises: [] }];
    setDraft({ ...draft, workouts });
    setActiveDayIdx(workouts.length - 1);
  };

  const deleteDay = (idx: number) => {
    if (!draft || draft.workouts.length <= 1) return;
    const workouts = draft.workouts.filter((_, i) => i !== idx);
    setDraft({ ...draft, workouts });
    setActiveDayIdx(Math.max(0, Math.min(activeDayIdx, workouts.length - 1)));
  };

  const addExercise = (name: string) => {
    if (!draft) return;
    const day = draft.workouts[activeDayIdx];
    const sets: PrescribedSet[] = [[10, 0, false], [10, 0, false], [10, 0, false]];
    const next: WorkoutExercise = { exercise: name, sets };
    patchDay(activeDayIdx, { exercises: [...day.exercises, next] });
    setPickerOpen(false);
  };

  const removeExercise = (i: number) => {
    if (!draft) return;
    const day = draft.workouts[activeDayIdx];
    patchDay(activeDayIdx, { exercises: day.exercises.filter((_, x) => x !== i) });
  };

  const adjustSets = (i: number, delta: number) => {
    if (!draft) return;
    const day = draft.workouts[activeDayIdx];
    const ex = day.exercises[i];
    const cur = ex.sets.length;
    const target = Math.max(1, Math.min(10, cur + delta));
    let sets = ex.sets.slice();
    if (target > cur) {
      const last = sets[sets.length - 1] ?? [10, 0, false];
      while (sets.length < target) sets.push([...last] as PrescribedSet);
    } else {
      sets = sets.slice(0, target);
    }
    const exercises = day.exercises.slice();
    exercises[i] = { ...ex, sets };
    patchDay(activeDayIdx, { exercises });
  };

  const adjustReps = (i: number, delta: number) => {
    if (!draft) return;
    const day = draft.workouts[activeDayIdx];
    const ex = day.exercises[i];
    const sets = ex.sets.map(([r, w, a]) =>
      [Math.max(1, Math.min(99, r + delta)), w, a] as PrescribedSet);
    const exercises = day.exercises.slice();
    exercises[i] = { ...ex, sets };
    patchDay(activeDayIdx, { exercises });
  };

  // ────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6 px-8 pb-8 h-full">
      {/* ── Left rail: plan list ─────────────────────────────────── */}
      <aside className="bg-panel rounded-3xl p-5 border border-border shadow-card flex flex-col">
        <header className="flex items-baseline justify-between px-1 mb-3">
          <span className="text-[11px] font-bold tracking-widest text-gray-dark">
            YOUR PLANS
          </span>
          <span className="text-sm font-bold text-gray-dark">{plans.length}</span>
        </header>

        <button
          onClick={createNew}
          className="border-2 border-dashed border-accent text-accent font-bold py-3 rounded-xl hover:bg-accent/5 transition"
        >
          + New plan
        </button>

        <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
          {plans.map((p) => {
            const isSelected = p.id === selectedId;
            const isActive   = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => selectPlan(p.id)}
                className={
                  "text-left px-4 py-3 rounded-xl border transition relative " +
                  (isSelected
                    ? "bg-panel-dark border-accent"
                    : "bg-panel border-border hover:bg-panel-dark")
                }
              >
                {/* red left border accent */}
                <span
                  className={
                    "absolute left-1 top-2 bottom-2 w-1 rounded-full " +
                    (isActive ? "bg-accent" : "bg-transparent")
                  }
                />
                <div className="pl-3 font-bold text-ink">{p.name}</div>
                <div className="pl-3 text-xs text-gray-dark mt-0.5">
                  {PROGRESSION_LABEL[p.progression]} · {p.workouts.length} day{p.workouts.length === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right column: editor ─────────────────────────────────── */}
      {draft ? (
        <Editor
          draft={draft}
          activeDayIdx={activeDayIdx}
          isActive={draft.id === activeId}
          dirty={dirty}
          onPatchDraft={patchDraft}
          onSelectDay={setActiveDayIdx}
          onAddDay={addDay}
          onDeleteDay={deleteDay}
          onAddExercise={() => setPickerOpen(true)}
          onRemoveExercise={removeExercise}
          onAdjustSets={adjustSets}
          onAdjustReps={adjustReps}
          onMarkActive={markActive}
          onStartDay={startDay}
          onSave={saveCurrent}
          onDelete={deleteCurrent}
        />
      ) : (
        <EmptyState onCreate={createNew} />
      )}

      {pickerOpen && draft && (
        <ExercisePicker
          alreadyIn={draft.workouts[activeDayIdx]?.exercises.map((e) => e.exercise) ?? []}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────

interface EditorProps {
  draft: Plan;
  activeDayIdx: number;
  isActive: boolean;
  dirty: boolean;
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

function Editor(p: EditorProps) {
  const day = p.draft.workouts[p.activeDayIdx];
  const totalSets = day?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0;
  const estMin = Math.max(1, Math.round(totalSets * 1.5));

  return (
    <section className="flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            PLAN NAME
          </div>
          <input
            value={p.draft.name}
            onChange={(e) => p.onPatchDraft({ name: e.target.value })}
            className="w-full mt-2 text-3xl font-extrabold text-ink bg-panel-dark rounded-2xl px-5 py-3 border border-border focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={p.onMarkActive}
          disabled={p.isActive}
          className={
            "ml-5 mt-7 px-5 py-2 rounded-full font-bold border transition " +
            (p.isActive
              ? "bg-good text-white border-good cursor-default"
              : "bg-panel text-ink border-border hover:bg-panel-dark")
          }
        >
          {p.isActive ? "Active" : "Set as active"}
        </button>
      </div>

      {/* Progression + Days row */}
      <div className="grid grid-cols-[1fr_auto] gap-8 mt-6">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
            PROGRESSION
          </div>
          <div className="flex gap-2">
            {PROGRESSIONS.map((pr) => (
              <button
                key={pr.id}
                onClick={() => p.onPatchDraft({ progression: pr.id })}
                className={
                  "px-5 py-2 rounded-full font-bold text-sm transition " +
                  (p.draft.progression === pr.id
                    ? "bg-nav text-white"
                    : "bg-panel text-gray-dark border border-border hover:bg-panel-dark")
                }
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
            DAYS
          </div>
          <div className="flex gap-2 items-center">
            {p.draft.workouts.map((d, i) => (
              <button
                key={i}
                onClick={() => p.onSelectDay(i)}
                className={
                  "w-10 h-10 rounded-full font-bold transition " +
                  (i === p.activeDayIdx
                    ? "bg-accent text-white"
                    : "bg-panel text-gray-dark border border-border hover:bg-panel-dark")
                }
              >
                {d.name}
              </button>
            ))}
            <button
              onClick={p.onAddDay}
              className="w-10 h-10 rounded-full bg-panel text-gray-dark border border-border hover:bg-panel-dark"
              title="Add day"
            >
              +
            </button>
            {p.draft.workouts.length > 1 && (
              <button
                onClick={() => p.onDeleteDay(p.activeDayIdx)}
                className="w-10 h-10 rounded-full bg-panel text-gray-dark border border-border hover:bg-panel-dark"
                title="Remove this day"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exercises header */}
      <div className="flex items-baseline justify-between mt-7 px-1">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          EXERCISES · DAY {day?.name ?? "—"}
        </div>
        <div className="text-xs text-gray-dark">
          {day?.exercises.length ?? 0} · ~{estMin} min
        </div>
      </div>

      {/* Exercise rows */}
      <div className="mt-3 flex flex-col gap-3">
        {day?.exercises.map((e, i) => (
          <ExerciseRow
            key={`${e.exercise}-${i}`}
            index={i}
            ex={e}
            onRemove={() => p.onRemoveExercise(i)}
            onSets={(d) => p.onAdjustSets(i, d)}
            onReps={(d) => p.onAdjustReps(i, d)}
          />
        ))}
        <button
          onClick={p.onAddExercise}
          className="border-2 border-dashed border-border text-gray-dark font-bold py-3 rounded-xl hover:bg-panel-dark transition"
        >
          + Add exercise
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={p.onSave}
          disabled={!p.dirty}
          className={
            "flex-1 py-4 rounded-2xl font-bold border transition " +
            (p.dirty
              ? "bg-panel text-ink border-border hover:bg-panel-dark"
              : "bg-panel-dark text-gray-dark border-border cursor-default")
          }
        >
          Save changes
        </button>
        <button
          onClick={p.onStartDay}
          disabled={!day || day.exercises.length === 0}
          className="flex-[2] py-4 rounded-2xl font-bold bg-accent text-white hover:bg-accent-hov transition flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="inline-block w-0 h-0
            border-y-7 border-y-transparent
            border-l-[11px] border-l-white" />
          Start Day {day?.name ?? ""}
        </button>
        <button
          onClick={p.onDelete}
          disabled={DEFAULT_PLANS.some((dp) => dp.id === p.draft.id)}
          className="w-14 h-14 rounded-xl bg-panel border border-border text-gray-dark hover:bg-panel-dark hover:text-accent transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Delete plan"
          aria-label="Delete plan"
        >
          🗑
        </button>
      </div>
    </section>
  );
}

function ExerciseRow({
  index, ex, onRemove, onSets, onReps,
}: {
  index: number; ex: WorkoutExercise;
  onRemove(): void; onSets(d: number): void; onReps(d: number): void;
}) {
  const meta = exerciseMeta(ex.exercise);
  const tracked = isTracked(ex.exercise);
  const reps = ex.sets[0]?.[0] ?? 10;
  const initials = ex.exercise.split(" ").map((w) => w[0]?.toUpperCase()).join("").slice(0, 1);
  const bg = meta ? MUSCLE_COLORS[meta.primary] : "#E0E0E8";

  return (
    <div className="bg-panel border border-border rounded-2xl px-4 py-3 flex items-center gap-4">
      <span
        className="w-9 h-9 rounded-lg grid place-items-center font-extrabold text-ink"
        style={{ background: bg }}
      >
        {initials || (index + 1)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink truncate">
            {titleCase(ex.exercise)}
          </span>
          {tracked && (
            <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
              CAM
            </span>
          )}
        </div>
        <div className="text-xs text-gray-dark mt-0.5">
          {meta?.primary ?? "—"}
        </div>
      </div>
      <Stepper label="sets" value={ex.sets.length} onMinus={() => onSets(-1)} onPlus={() => onSets(+1)} />
      <Stepper label="reps" value={reps}             onMinus={() => onReps(-1)} onPlus={() => onReps(+1)} />
      <button
        onClick={onRemove}
        className="w-9 h-9 rounded-lg bg-panel border border-border text-gray-dark hover:bg-panel-dark hover:text-accent transition"
        title="Remove"
        aria-label="Remove exercise"
      >
        ×
      </button>
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: {
  label: string; value: number; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="flex items-center bg-panel-dark rounded-full px-2 py-1 border border-border">
      <button onClick={onMinus} className="w-6 h-6 rounded-full text-ink hover:text-accent">−</button>
      <span className="px-2 font-bold text-ink min-w-[2.2rem] text-center">{value}</span>
      <span className="text-[10px] text-gray-dark mr-1">{label}</span>
      <button onClick={onPlus} className="w-6 h-6 rounded-full text-ink hover:text-accent">+</button>
    </div>
  );
}

function ExercisePicker({
  alreadyIn, onPick, onClose,
}: {
  alreadyIn: string[]; onPick(name: string): void; onClose(): void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center z-40"
      onClick={onClose}
    >
      <div
        className="bg-panel rounded-3xl p-6 w-[480px] max-h-[70vh] overflow-y-auto border border-border shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-extrabold text-ink">Add exercise</h2>
          <button onClick={onClose} className="text-gray-dark hover:text-ink text-xl">×</button>
        </div>
        <div className="flex flex-col gap-2">
          {EXERCISE_CATALOG.map((m) => {
            const inUse = alreadyIn.includes(m.name);
            return (
              <button
                key={m.name}
                onClick={() => onPick(m.name)}
                disabled={inUse}
                className={
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left " +
                  (inUse
                    ? "bg-panel-dark border-border opacity-50 cursor-not-allowed"
                    : "bg-panel border-border hover:bg-panel-dark")
                }
              >
                <span
                  className="w-8 h-8 rounded-lg grid place-items-center font-extrabold text-ink"
                  style={{ background: MUSCLE_COLORS[m.primary] }}
                >
                  {m.name[0].toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-ink flex items-center gap-2">
                    {titleCase(m.name)}
                    {isTracked(m.name) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
                        CAM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-dark">
                    {m.primary} · {m.equipment}
                  </div>
                </div>
                {inUse && <span className="text-xs text-gray-dark">Already added</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate(): void }) {
  return (
    <section className="grid place-items-center">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-ink">No plans yet</div>
        <p className="text-gray-dark mt-2">Create your first plan to get started.</p>
        <button
          onClick={onCreate}
          className="mt-5 bg-accent text-white font-bold px-6 py-3 rounded-2xl"
        >
          + New plan
        </button>
      </div>
    </section>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
