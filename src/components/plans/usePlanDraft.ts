// Plan collection + editor draft state. Split out of Plans.tsx so that file is
// just the three views it composes.

import { useEffect, useMemo, useState } from "react";
import {
  deletePlan as deletePlanData,
  loadPlans,
  newPlan as newPlanData,
  nextDayName,
  savePlans,
  setActivePlan,
  type Plan,
  type PrescribedSet,
  type WorkoutDay,
} from "@/data/plans/plans";
import { getStrategy } from "@/data/progressions";
import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import { useSessionStore } from "@/stores/sessionStore";

export function usePlanDraft() {
  const { startSession } = useSessionStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [activeId, setActiveId] = useState<string | null>(getSettings().activePlanId);
  // True when the open editor is for a plan created this session, so the
  // header can read "New Plan" instead of "Edit Plan".
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { void loadPlans().then(setPlans); }, []);

  // Home falls back to the first plan when no active id is stored, so the list
  // must badge the same one — otherwise Home runs "today's workout" off a plan
  // that shows no Active marker here.
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

  const patchDay = (idx: number, p: Partial<WorkoutDay>) =>
    setDraft((d) => {
      if (!d) return d;
      const workouts = d.workouts.slice();
      workouts[idx] = { ...workouts[idx], ...p };
      return { ...d, workouts };
    });

  /** Replace one exercise's set list in the active day. */
  const patchExercise = (i: number, sets: PrescribedSet[]) => {
    if (!draft) return;
    const exercises = draft.workouts[activeDayIdx].exercises.slice();
    exercises[i] = { ...exercises[i], sets };
    patchDay(activeDayIdx, { exercises });
  };

  return {
    plans, draft, isNew, dirty, activeDayIdx, effectiveActiveId,
    setActiveDayIdx,

    openPlan(id: string) {
      const p = plans.find((x) => x.id === id);
      if (!p) return;
      setSelectedId(id);
      setDraft(structuredClone(p));
      setActiveDayIdx(0);
      setIsNew(false);
    },

    // Split from closeEditor so the editor can ask *before* playing its exit
    // animation — a cancelled confirm must leave the screen exactly as it was.
    canCloseEditor: () => !dirty || confirm("Discard unsaved changes?"),

    closeEditor() {
      setDraft(null);
      setSelectedId(null);
      setIsNew(false);
    },

    async createNew() {
      const p = await newPlanData("Untitled Plan");
      setPlans(await loadPlans());
      setSelectedId(p.id);
      setDraft(structuredClone(p));
      setActiveDayIdx(0);
      setIsNew(true);
    },

    async saveCurrent() {
      if (!draft) return;
      const next = plans.map((p) => (p.id === draft.id ? draft : p));
      await savePlans(next);
      setPlans(next);
      setIsNew(false);
    },

    async deleteCurrent() {
      if (!selectedId) return;
      if (!confirm("Delete this plan?")) return;
      setPlans(await deletePlanData(selectedId));
      setDraft(null);
      setSelectedId(null);
      setActiveId(getSettings().activePlanId);
    },

    async markActive() {
      if (!draft) return;
      await setActivePlan(draft.id);
      setActiveId(draft.id);
    },

    startDay() {
      if (!draft?.workouts[activeDayIdx]) return;
      const strategy = getStrategy(draft.progression);
      startSession(strategy.prepareSession(draft, activeDayIdx, getAthlete()));
    },

    patchDraft: (p: Partial<Plan>) => setDraft((d) => (d ? { ...d, ...p } : d)),

    addDay() {
      if (!draft) return;
      const workouts = [...draft.workouts, { name: nextDayName(draft.workouts), exercises: [] }];
      setDraft({ ...draft, workouts });
      setActiveDayIdx(workouts.length - 1);
    },

    deleteDay(idx: number) {
      if (!draft || draft.workouts.length <= 1) return;
      const workouts = draft.workouts.filter((_, i) => i !== idx);
      setDraft({ ...draft, workouts });
      setActiveDayIdx(Math.max(0, Math.min(activeDayIdx, workouts.length - 1)));
    },

    addExercise(name: string) {
      if (!draft) return;
      const sets: PrescribedSet[] = [[10, 0, false], [10, 0, false], [10, 0, false]];
      const day = draft.workouts[activeDayIdx];
      patchDay(activeDayIdx, { exercises: [...day.exercises, { exercise: name, sets }] });
    },

    removeExercise(i: number) {
      if (!draft) return;
      const day = draft.workouts[activeDayIdx];
      patchDay(activeDayIdx, { exercises: day.exercises.filter((_, x) => x !== i) });
    },

    adjustSets(i: number, delta: number) {
      if (!draft) return;
      const ex = draft.workouts[activeDayIdx].exercises[i];
      const cur = ex.sets.length;
      const target = Math.max(1, Math.min(10, cur + delta));
      let sets = ex.sets.slice();
      if (target > cur) {
        const last = sets[sets.length - 1] ?? [10, 0, false];
        while (sets.length < target) sets.push([...last] as PrescribedSet);
      } else {
        sets = sets.slice(0, target);
      }
      patchExercise(i, sets);
    },

    adjustReps(i: number, delta: number) {
      if (!draft) return;
      const ex = draft.workouts[activeDayIdx].exercises[i];
      patchExercise(i, ex.sets.map(([r, w, a]) =>
        [Math.max(1, Math.min(99, r + delta)), w, a] as PrescribedSet));
    },
  };
}
