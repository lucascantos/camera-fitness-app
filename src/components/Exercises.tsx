// Ported from: legacy exercise-library screen.
//
// Mobile-first: a search field and a list of exercises. Sort, body-part and
// equipment filters live in a bottom sheet rather than an always-visible
// filter row — three wrapping pill rows ate most of a phone screen before the
// first result. The filter button carries a dot when anything is narrowing
// the list, so hidden filters can't silently strand the user on "No matches".

import { useMemo, useState } from "react";
import {
  EXERCISE_CATALOG,
  MUSCLE_COLORS,
  MUSCLE_GROUPS,
  muscleInGroup,
  isTracked,
  type Equipment,
  type ExerciseMeta,
  type MuscleGroup,
} from "@/data/exercises/catalog";
import { bestSetFor, lastSetFor, formatBest, type BestSet } from "@/data/athlete/bestSet";
import { isFavorite, toggleFavorite } from "@/data/settings/favorites";
import { makeSession } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";
import { useDismissable } from "@/hooks/useDismissable";
import { PlayIcon, FilterIcon, SortIcon } from "@/components/icons";

type SortMode = "az" | "best" | "favorite";

const EQUIPMENT_FILTERS: { id: Equipment | "any"; label: string }[] = [
  { id: "any",         label: "Any equip"  },
  { id: "bodyweight",  label: "Bodyweight" },
  { id: "dumbbell",    label: "Dumbbell"   },
  { id: "barbell",     label: "Barbell"    },
  { id: "cable",       label: "Cable"      },
];

const SORT_LABEL: Record<SortMode, string> = {
  az:       "A–Z",
  best:     "Best",
  favorite: "Favourites",
};

const SORT_ORDER: SortMode[] = ["az", "best", "favorite"];

/** The filter/sort selection the sheet edits. */
interface Filters {
  muscle: MuscleGroup | "All";
  equip: Equipment | "any";
  sort: SortMode;
}

const DEFAULT_FILTERS: Filters = { muscle: "All", equip: "any", sort: "az" };

export function Exercises() {
  const { startSession } = useSessionStore();
  const [query,   setQuery]   = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Bump on favourite toggle to re-evaluate isFavorite() reads.
  const [favTick, setFavTick] = useState(0);

  const enriched = useMemo(() => {
    return EXERCISE_CATALOG.map((m) => ({
      meta: m,
      tracked: isTracked(m.name),
      best: bestSetFor(m.name),
      fav: isFavorite(m.name),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favTick]);

  const visible = useMemo(() => {
    let rows = enriched;
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.meta.name.includes(q));
    if (filters.muscle !== "All") {
      rows = rows.filter((r) => muscleInGroup(r.meta.primary, filters.muscle as MuscleGroup));
    }
    if (filters.equip !== "any") {
      rows = rows.filter((r) => r.meta.equipment === filters.equip);
    }
    const sorted = rows.slice();
    if (filters.sort === "az") {
      sorted.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    } else if (filters.sort === "best") {
      sorted.sort((a, b) => weightScore(b.best) - weightScore(a.best));
    } else {
      sorted.sort((a, b) =>
        Number(b.fav) - Number(a.fav) || a.meta.name.localeCompare(b.meta.name));
    }
    return sorted;
  }, [enriched, query, filters]);

  const startOne = (name: string) => {
    // Standalone start (not a plan with progression): pre-fill the set with the
    // weight/reps the athlete last logged for this exercise, falling back to a
    // sensible 10-rep / bodyweight default if there's no history.
    const last = lastSetFor(name);
    startSession(makeSession(1, [[name, [[last?.reps ?? 10, last?.weight ?? 0, false]]]]));
  };

  const onToggleFav = async (name: string) => {
    await toggleFavorite(name);
    setFavTick((t) => t + 1);
  };

  const filtersActive =
    filters.muscle !== "All" || filters.equip !== "any" || filters.sort !== "az";
  const catalogTotal = EXERCISE_CATALOG.length;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark">
        EXERCISE LIBRARY
      </div>

      {/* Search + filter trigger */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 flex items-center bg-panel rounded-2xl border border-border px-3 shadow-card">
          <span className="text-gray-dark mr-2">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${catalogTotal} exercises...`}
            className="flex-1 min-w-0 bg-transparent outline-none py-3 text-ink placeholder:text-gray-dark"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-gray-dark text-xl px-1 shrink-0"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="relative w-12 shrink-0 grid place-items-center bg-panel rounded-2xl border border-border shadow-card text-ink active:bg-panel-dark transition"
          aria-label="Filters and sort"
        >
          <FilterIcon size={18} />
          {filtersActive && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          )}
        </button>
      </div>

      {/* Active-filter summary — the escape hatch when the sheet is closed */}
      {filtersActive && (
        <button
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="self-start text-xs font-bold text-accent px-1"
        >
          Clear filters ·{" "}
          {[
            filters.muscle !== "All" ? filters.muscle : null,
            filters.equip !== "any"
              ? EQUIPMENT_FILTERS.find((e) => e.id === filters.equip)?.label
              : null,
            filters.sort !== "az" ? SORT_LABEL[filters.sort] : null,
          ].filter(Boolean).join(" · ")}
        </button>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <div className="py-10 text-center text-gray-dark">No matches.</div>
        )}
        {visible.map(({ meta, tracked, best, fav }) => (
          <Row
            key={meta.name}
            meta={meta}
            tracked={tracked}
            best={best}
            favorite={fav}
            onToggleFavorite={() => onToggleFav(meta.name)}
            onStart={() => startOne(meta.name)}
          />
        ))}
      </div>

      {sheetOpen && (
        <FilterSheet
          value={filters}
          onApply={setFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Filter bottom sheet
// ──────────────────────────────────────────────────────────────────────────

function FilterSheet({
  value, onApply, onClose,
}: {
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
        {/* drag handle */}
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

// ──────────────────────────────────────────────────────────────────────────
// List row
// ──────────────────────────────────────────────────────────────────────────

function Row({
  meta, tracked, best, favorite, onToggleFavorite, onStart,
}: {
  meta: ExerciseMeta;
  tracked: boolean;
  best: BestSet | null;
  favorite: boolean;
  onToggleFavorite(): void;
  onStart(): void;
}) {
  const equip = meta.equipment.charAt(0).toUpperCase() + meta.equipment.slice(1);
  return (
    <div className="flex items-center gap-3 bg-panel rounded-2xl border border-border shadow-card px-3 py-3">
      <span
        className="w-10 h-10 rounded-xl grid place-items-center font-extrabold text-ink shrink-0"
        style={{ background: MUSCLE_COLORS[meta.primary] }}
      >
        {meta.name[0].toUpperCase()}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink truncate">{titleCase(meta.name)}</span>
          {tracked && (
            <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider shrink-0">
              CAM
            </span>
          )}
        </div>
        {/* Best set rides along in the subtitle — the old right-hand BEST
            column can't coexist with a name on a 375px row. */}
        <div className="text-xs text-gray-dark mt-0.5 truncate">
          {meta.primary} · {equip}
          {best && <span className="text-ink font-semibold"> · {formatBest(best)}</span>}
        </div>
      </div>

      <button
        onClick={onToggleFavorite}
        className={
          "w-9 h-9 grid place-items-center text-xl shrink-0 transition " +
          (favorite ? "text-coin" : "text-border")
        }
        aria-label={favorite ? `Unfavourite ${meta.name}` : `Favourite ${meta.name}`}
      >
        {favorite ? "★" : "☆"}
      </button>

      <button
        onClick={onStart}
        className="w-11 h-11 rounded-full bg-accent active:bg-accent-hov text-white grid place-items-center shrink-0 transition"
        aria-label={`Start ${meta.name}`}
      >
        <PlayIcon size={13} color="#FFFFFF" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function weightScore(b: BestSet | null): number {
  if (!b) return -1;
  // Bodyweight rows still rank by reps so "no record" stays at the bottom.
  return b.weight === 0 ? b.reps * 0.1 : b.weight * 1000 + b.reps;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
