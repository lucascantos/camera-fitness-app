// Ported from: scenes/workout_plans.py (legacy FitnessApp repo)
//
// Two screens, mobile-first:
//   1. List    — "Your Plans", a + New plan affordance, one card per plan.
//   2. Editor  — opened by tapping a card; a full-screen overlay.
//
// The pieces live under ./plans/: state in usePlanDraft, views in PlanList /
// PlanEditor / ExercisePicker.

import { useState } from "react";
import { PlanList } from "./plans/PlanList";
import { PlanEditor } from "./plans/PlanEditor";
import { ExercisePicker } from "./plans/ExercisePicker";
import { usePlanDraft } from "./plans/usePlanDraft";

export function Plans() {
  const p = usePlanDraft();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <PlanList
        plans={p.plans}
        activeId={p.effectiveActiveId}
        onOpen={p.openPlan}
        onCreate={p.createNew}
      />

      {p.draft && (
        <PlanEditor
          draft={p.draft}
          isNew={p.isNew}
          activeDayIdx={p.activeDayIdx}
          isActive={p.draft.id === p.effectiveActiveId}
          dirty={p.dirty}
          canClose={p.canCloseEditor}
          onClose={p.closeEditor}
          onPatchDraft={p.patchDraft}
          onSelectDay={p.setActiveDayIdx}
          onAddDay={p.addDay}
          onDeleteDay={p.deleteDay}
          onAddExercise={() => setPickerOpen(true)}
          onRemoveExercise={p.removeExercise}
          onAdjustSets={p.adjustSets}
          onAdjustReps={p.adjustReps}
          onMarkActive={p.markActive}
          onStartDay={p.startDay}
          onSave={p.saveCurrent}
          onDelete={p.deleteCurrent}
        />
      )}

      {pickerOpen && p.draft && (
        <ExercisePicker
          alreadyIn={p.draft.workouts[p.activeDayIdx]?.exercises.map((e) => e.exercise) ?? []}
          onPick={(name) => { p.addExercise(name); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
