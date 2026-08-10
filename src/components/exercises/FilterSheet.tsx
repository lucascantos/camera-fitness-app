// Sort, body-part and equipment filters in a bottom sheet rather than an
// always-visible filter row — three wrapping pill rows ate most of a phone
// screen before the first result.

import { useState } from "react";
import { MUSCLE_GROUPS } from "@/data/exercises/catalog";
import { useDismissable } from "@/hooks/useDismissable";
import { SortIcon } from "@/components/icons";
import {
  EQUIPMENT_FILTERS, SORT_LABEL, SORT_ORDER, type Filters,
} from "./filters";

export function FilterSheet({ value, onApply, onClose }: {
  value: Filters;
  onApply(f: Filters): void;
  onClose(): void;
}) {
  // Edited as a draft so backing out with × leaves the list untouched.
  const [draft, setDraft] = useState<Filters>(value);
  const { closing, dismiss } = useDismissable(onClose);

  return (
    <div
      className={
        "fixed inset-0 z-50 bg-black/40 flex items-end " +
        (closing ? "animate-fade-out" : "animate-fade-in")
      }
      onClick={dismiss}
    >
      <div
        className={
          "w-full bg-bg rounded-t-3xl max-h-[85dvh] overflow-y-auto " +
          (closing ? "animate-sheet-down" : "animate-sheet-up")
        }
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">Filters</h2>
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-full bg-panel border border-border grid place-items-center text-gray-dark text-xl leading-none"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className="px-5 flex flex-col gap-5 mt-2">
          {/* Sort — tapping cycles through the modes */}
          <Group label="SORT">
            <button
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  sort: SORT_ORDER[(SORT_ORDER.indexOf(d.sort) + 1) % SORT_ORDER.length],
                }))
              }
              className="w-full min-h-[52px] flex items-center justify-between bg-panel rounded-2xl border border-border px-4 font-bold text-ink"
            >
              {SORT_LABEL[draft.sort]}
              <SortIcon size={16} />
            </button>
          </Group>

          <Group label="BODY PART">
            <div className="flex flex-wrap gap-2">
              <Pill
                selected={draft.muscle === "All"}
                onClick={() => setDraft((d) => ({ ...d, muscle: "All" }))}
              >
                All
              </Pill>
              {MUSCLE_GROUPS.map((g) => (
                <Pill
                  key={g.id}
                  selected={draft.muscle === g.id}
                  onClick={() => setDraft((d) => ({ ...d, muscle: g.id }))}
                >
                  {g.id}
                </Pill>
              ))}
            </div>
          </Group>

          <Group label="EQUIPMENT">
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_FILTERS.map((e) => (
                <Pill
                  key={e.id}
                  selected={draft.equip === e.id}
                  onClick={() => setDraft((d) => ({ ...d, equip: e.id }))}
                >
                  {e.label}
                </Pill>
              ))}
            </div>
          </Group>

          <button
            // Commit immediately, then play the sheet out — the filtered list
            // is already visible behind it as it slides away.
            onClick={() => { onApply(draft); dismiss(); }}
            className="w-full min-h-[56px] rounded-2xl font-bold text-lg bg-accent text-white active:bg-accent-hov transition mt-1"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
        {label}
      </div>
      {children}
    </section>
  );
}

function Pill({ selected, onClick, children }: {
  selected: boolean; onClick(): void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 min-h-[44px] rounded-full text-sm font-bold transition " +
        (selected
          ? "bg-nav text-white"
          : "bg-panel text-ink border border-border active:bg-panel-dark")
      }
    >
      {children}
    </button>
  );
}
