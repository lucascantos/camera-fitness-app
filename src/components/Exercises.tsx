// Ported from: legacy exercise-library screen.
//
// Mobile-first: a search field and a list of exercises. Sort, body-part and
// equipment filters live in a bottom sheet (./exercises/FilterSheet). The
// filter button carries a dot when anything is narrowing the list, so hidden
// filters can't silently strand the user on "No matches".

import { useMemo, useState } from "react";
import {
  EXERCISE_CATALOG,
  muscleInGroup,
  isTracked,
  type MuscleGroup,
} from "@/data/exercises/catalog";
import { bestSetFor, lastSetFor } from "@/data/athlete/bestSet";
import { isFavorite, toggleFavorite } from "@/data/settings/favorites";
import { makeSession } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";
import { FilterIcon } from "@/components/icons";
import { Row } from "./exercises/Row";
import { FilterSheet } from "./exercises/FilterSheet";
import { StartSheet } from "./exercises/StartSheet";
import {
  DEFAULT_FILTERS, describeFilters, isFiltering, weightScore, type Filters,
} from "./exercises/filters";

export function Exercises() {
  const { startSession } = useSessionStore();
  const [query,   setQuery]   = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Exercise awaiting a sets/reps choice, or null when no sheet is up.
  const [starting, setStarting] = useState<string | null>(null);
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

  const startOne = (name: string, sets: number, reps: number) => {
    // Standalone start (not a plan with progression): the athlete picks the
    // volume in the sheet; weight carries over from whatever they last logged
    // for this exercise, falling back to bodyweight if there's no history.
    const weight = lastSetFor(name)?.weight ?? 0;
    const prescribed = Array.from(
      { length: sets },
      () => [reps, weight, false] as [number, number, boolean],
    );
    startSession(makeSession(1, [[name, prescribed]]));
  };

  const onToggleFav = async (name: string) => {
    await toggleFavorite(name);
    setFavTick((t) => t + 1);
  };

  const filtersActive = isFiltering(filters);

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
            placeholder={`Search ${EXERCISE_CATALOG.length} exercises...`}
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
          Clear filters · {describeFilters(filters)}
        </button>
      )}

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
            onStart={() => setStarting(meta.name)}
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

      {starting && (
        <StartSheet
          exercise={starting}
          onStart={(sets, reps) => startOne(starting, sets, reps)}
          onClose={() => setStarting(null)}
        />
      )}
    </div>
  );
}
