// Ported from: scenes/workout_plans.py (legacy FitnessApp repo)
//
// Two screens, mobile-first:
//   1. List    — "Your Plans", a + New plan affordance, one card per plan.
//   2. Editor  — opened by tapping a card; a full-screen overlay with its own
//                back header, so it covers the bottom tab bar the way a
//                pushed route would.
//
// The editor is an overlay rather than a scene because the app has no router;
// this matches how QuickSettings and the exercise picker already work.

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLANS,
  deletePlan as deletePlanData,
  loadPlans,
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
import { getStrategy } from "@/data/progressions";
import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import {
  EXERCISE_CATALOG,
  exerciseMeta,
  isTracked,
  MUSCLE_COLORS,
} from "@/data/exercises/catalog";
import { useSessionStore } from "@/stores/sessionStore";
import { useDismissable } from "@/hooks/useDismissable";
import { BackIcon, PlayIcon } from "@/components/icons";

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
// Container — owns the plan collection and which view is showing.
// ──────────────────────────────────────────────────────────────────────────

export function Plans() {
  const { startSession } = useSessionStore();
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [draft, setDraft]           = useState<Plan | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId]     = useState<string | null>(getSettings().activePlanId);
  // True when the open editor is for a plan created this session, so the
  // header can read "New Plan" instead of "Edit Plan".
  const [isNew, setIsNew]           = useState(false);

  useEffect(() => {
    (async () => {
      setPlans(await loadPlans());
    })();
  }, []);

  // Home falls back to the first plan when no active id is stored, so the
  // list must badge the same one — otherwise Home runs "today's workout" off
  // a plan that shows no Active marker here.
  const effectiveActiveId = activeId ?? plans[0]?.id ?? null;

  // Dirty flag — drives the "unsaved changes" guard on back.
  const original = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId],
  );
  const dirty = useMemo(
    () => draft != null && original != null
      && JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  );

  // ── navigation ───────────────────────────────────────────────────────
  const openPlan = (id: string) => {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setDraft(structuredClone(p));
    setActiveDayIdx(0);
    setIsNew(false);
  };

  // Split from closeEditor so the editor can ask *before* playing its exit
  // animation — a cancelled confirm must leave the screen exactly as it was.
  const canCloseEditor = () => !dirty || confirm("Discard unsaved changes?");

  const closeEditor = () => {
    setDraft(null);
    setSelectedId(null);
    setIsNew(false);
  };

  const createNew = async () => {
    const p = await newPlanData("Untitled Plan");
    setPlans(await loadPlans());
    setSelectedId(p.id);
    setDraft(structuredClone(p));
    setActiveDayIdx(0);
    setIsNew(true);
  };

  // ── persistence ──────────────────────────────────────────────────────
  const saveCurrent = async () => {
    if (!draft) return;
    const next = plans.map((p) => (p.id === draft.id ? draft : p));
    await savePlans(next);
    setPlans(next);
    setIsNew(false);
  };

  const deleteCurrent = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this plan?")) return;
    setPlans(await deletePlanData(selectedId));
    setDraft(null);
    setSelectedId(null);
    setActiveId(getSettings().activePlanId);
  };

  const markActive = async () => {
    if (!draft) return;
    await setActivePlan(draft.id);
    setActiveId(draft.id);
  };

  const startDay = () => {
    if (!draft || !draft.workouts[activeDayIdx]) return;
    const strategy = getStrategy(draft.progression);
    startSession(strategy.prepareSession(draft, activeDayIdx, getAthlete()));
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
    const workouts = [...draft.workouts, { name: nextDayName(draft.workouts), exercises: [] }];
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
    patchDay(activeDayIdx, { exercises: [...day.exercises, { exercise: name, sets }] });
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

  // ── render ───────────────────────────────────────────────────────────
  return (
    <>
      <PlanList
        plans={plans}
        activeId={effectiveActiveId}
        onOpen={openPlan}
        onCreate={createNew}
      />

      {draft && (
        <PlanEditor
          draft={draft}
          isNew={isNew}
          activeDayIdx={activeDayIdx}
          isActive={draft.id === effectiveActiveId}
          dirty={dirty}
          canClose={canCloseEditor}
          onClose={closeEditor}
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
      )}

      {pickerOpen && draft && (
        <ExercisePicker
          alreadyIn={draft.workouts[activeDayIdx]?.exercises.map((e) => e.exercise) ?? []}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 1. List view
// ──────────────────────────────────────────────────────────────────────────

function PlanList({
  plans, activeId, onOpen, onCreate,
}: {
  plans: Plan[];
  activeId: string | null;
  onOpen(id: string): void;
  onCreate(): void;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4 max-w-lg mx-auto w-full">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-extrabold text-ink">Your Plans</h1>
        <span className="text-sm font-bold text-gray-dark">{plans.length}</span>
      </div>

      <button
        onClick={onCreate}
        className="border-2 border-dashed border-accent text-accent font-bold min-h-[56px] rounded-2xl active:bg-accent/5 transition"
      >
        + New plan
      </button>

      <div className="flex flex-col gap-3">
        {plans.map((p) => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className={
                "w-full text-left flex items-center gap-3 bg-panel rounded-2xl px-4 py-4 shadow-card transition active:bg-panel-dark border-2 " +
                (isActive ? "border-accent" : "border-transparent")
              }
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink truncate">{p.name}</div>
                <div className="text-xs text-gray-dark mt-0.5 truncate">
                  {(getStrategy(p.progression).describe?.(p, getAthlete())
                    ?? PROGRESSION_LABEL[p.progression])}{" "}
                  · {p.workouts.length} day{p.workouts.length === 1 ? "" : "s"}
                </div>
              </div>
              {isActive && (
                <span className="px-2.5 py-1 rounded-full bg-good/15 text-good text-xs font-bold shrink-0">
                  Active
                </span>
              )}
              <span className="text-gray-dark text-xl leading-none shrink-0">›</span>
            </button>
          );
        })}

        {plans.length === 0 && (
          <div className="text-center py-10">
            <div className="text-xl font-extrabold text-ink">No plans yet</div>
            <p className="text-gray-dark mt-1">Create your first plan to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Editor view — full-screen overlay
// ──────────────────────────────────────────────────────────────────────────

interface EditorProps {
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

function PlanEditor(p: EditorProps) {
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
      {/* Header — back + title */}
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

      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-5">
          {/* Plan name */}
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

          {/* Days */}
          <Field
            label="DAYS"
            aside={`${day?.exercises.length ?? 0} exercises · ~${estMin} min`}
          >
            <div className="flex gap-2 items-center flex-wrap">
              {p.draft.workouts.map((d, i) => (
                <button
                  key={i}
                  onClick={() => p.onSelectDay(i)}
                  className={
                    "w-11 h-11 rounded-full font-bold transition " +
                    (i === p.activeDayIdx
                      ? "bg-accent text-white"
                      : "bg-panel text-gray-dark border border-border")
                  }
                >
                  {d.name}
                </button>
              ))}
              <button
                onClick={p.onAddDay}
                className="w-11 h-11 rounded-full bg-panel text-gray-dark border border-border text-xl"
                aria-label="Add day"
              >
                +
              </button>
              {p.draft.workouts.length > 1 && (
                <button
                  onClick={() => p.onDeleteDay(p.activeDayIdx)}
                  className="w-11 h-11 rounded-full bg-panel text-gray-dark border border-border text-xl"
                  aria-label="Remove this day"
                >
                  ×
                </button>
              )}
            </div>
          </Field>

          {/* Exercises */}
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

          {/* Secondary actions */}
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

/** Eyebrow-labelled block, with an optional right-aligned summary. */
function Field({
  label, aside, children,
}: {
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

function ExerciseCard({
  index, ex, autoManaged, onRemove, onSets, onReps,
}: {
  index: number; ex: WorkoutExercise;
  autoManaged: boolean;
  onRemove(): void; onSets(d: number): void; onReps(d: number): void;
}) {
  const meta = exerciseMeta(ex.exercise);
  const tracked = isTracked(ex.exercise);
  const reps = ex.sets[0]?.[0] ?? 10;
  const initial = ex.exercise[0]?.toUpperCase() ?? String(index + 1);
  const bg = meta ? MUSCLE_COLORS[meta.primary] : "#E0E0E8";

  return (
    <div className="bg-panel border border-border rounded-2xl p-3 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl grid place-items-center font-extrabold text-ink shrink-0"
          style={{ background: bg }}
        >
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink">{titleCase(ex.exercise)}</span>
            {tracked && (
              <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
                CAM
              </span>
            )}
            {autoManaged && (
              <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold tracking-wider">
                AUTO
              </span>
            )}
          </div>
          <div className="text-xs text-gray-dark mt-0.5">
            {autoManaged ? "Sets & reps set by progression" : (meta?.primary ?? "—")}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="w-9 h-9 rounded-full bg-panel-dark text-gray-dark grid place-items-center shrink-0 active:text-accent transition"
          aria-label={`Remove ${ex.exercise}`}
        >
          ×
        </button>
      </div>

      {!autoManaged && (
        <div className="flex gap-2 mt-3">
          <Stepper label="sets" value={ex.sets.length} onMinus={() => onSets(-1)} onPlus={() => onSets(+1)} />
          <Stepper label="reps" value={reps}           onMinus={() => onReps(-1)} onPlus={() => onReps(+1)} />
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: {
  label: string; value: number; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="flex-1 flex items-center justify-between bg-panel-dark rounded-full p-1">
      <button
        onClick={onMinus}
        className="w-9 h-9 rounded-full bg-panel text-ink text-xl grid place-items-center shrink-0"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="flex items-baseline gap-1 px-1 min-w-0">
        <span className="font-bold text-ink">{value}</span>
        <span className="text-[10px] text-gray-dark">{label}</span>
      </span>
      <button
        onClick={onPlus}
        className="w-9 h-9 rounded-full bg-nav text-white text-xl grid place-items-center shrink-0"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

function ExercisePicker({
  alreadyIn, onPick, onClose,
}: {
  alreadyIn: string[]; onPick(name: string): void; onClose(): void;
}) {
  const { closing, dismiss } = useDismissable(onClose);
  return (
    <div
      className={
        "fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 " +
        (closing ? "animate-fade-out" : "animate-fade-in")
      }
      onClick={dismiss}
    >
      <div
        className={
          "bg-panel rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-[480px] max-h-[85dvh] overflow-y-auto border border-border shadow-card " +
          (closing ? "animate-sheet-down sm:animate-fade-out" : "animate-sheet-up sm:animate-fade-in")
        }
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-extrabold text-ink">Add exercise</h2>
          <button onClick={dismiss} className="text-gray-dark text-2xl leading-none px-2">×</button>
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
                  "flex items-center gap-3 px-4 py-3 min-h-[56px] rounded-2xl border transition text-left " +
                  (inUse
                    ? "bg-panel-dark border-border opacity-50 cursor-not-allowed"
                    : "bg-panel border-border active:bg-panel-dark")
                }
              >
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-ink shrink-0"
                  style={{ background: MUSCLE_COLORS[m.primary] }}
                >
                  {m.name[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink flex items-center gap-2">
                    {titleCase(m.name)}
                    {isTracked(m.name) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider">
                        CAM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-dark truncate">
                    {m.primary} · {m.equipment}
                  </div>
                </div>
                {inUse && <span className="text-xs text-gray-dark shrink-0">Added</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
