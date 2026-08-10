// Stats → History tab. Lists every workout the athlete has logged (newest
// first). You can add a workout by hand, or select one to edit it — the editor
// lives in ./history/HistoryEditor as a full-screen overlay.

import { useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { fmtVolume, titleCase } from "@/lib/format";
import { HistoryEditor } from "./history/HistoryEditor";
import { blankEntry, entryVolume, formatDate } from "./history/helpers";

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
