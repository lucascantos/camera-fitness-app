// Ported from: legacy exercise-library screen.
// Search · muscle filter · equipment filter · sort · list of exercises with
// best-set lookup, CAM badge, favourite star, play button.

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
import { TRACKED_EXERCISES } from "@/tracking/exercises/registry";
import { bestSetFor, lastSetFor, formatBest, type BestSet } from "@/data/athlete/bestSet";
import { favoriteCount, isFavorite, toggleFavorite } from "@/data/settings/favorites";
import { makeSession } from "@/data/plans/plans";
import { useSessionStore } from "@/stores/sessionStore";
import { PlayIcon } from "@/components/icons";

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

export function Exercises() {
  const { startSession } = useSessionStore();
  const [query,     setQuery]    = useState("");
  const [muscle,    setMuscle]   = useState<MuscleGroup | "All">("All");
  const [equip,     setEquip]    = useState<Equipment | "any">("any");
  const [sortMode,  setSortMode] = useState<SortMode>("az");
  // Bump on favourite toggle to re-evaluate isFavorite() reads.
  const [favTick, setFavTick] = useState(0);

  // Compute best set for every exercise once, recompute when favourites or
  // history change between renders. Cheap — list is 8 long.
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
    if (muscle !== "All") {
      rows = rows.filter((r) => muscleInGroup(r.meta.primary, muscle));
    }
    if (equip !== "any") {
      rows = rows.filter((r) => r.meta.equipment === equip);
    }
    const sorted = rows.slice();
    if (sortMode === "az") {
      sorted.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    } else if (sortMode === "best") {
      sorted.sort((a, b) => weightScore(b.best) - weightScore(a.best));
    } else { // favorites
      sorted.sort((a, b) =>
        Number(b.fav) - Number(a.fav) || a.meta.name.localeCompare(b.meta.name));
    }
    return sorted;
  }, [enriched, query, muscle, equip, sortMode]);

  const startOne = (name: string) => {
    // Standalone start (not a plan with progression): pre-fill the set with the
    // weight/reps the athlete last logged for this exercise, falling back to a
    // sensible 10-rep / bodyweight default if there's no history.
    const last = lastSetFor(name);
    const reps = last?.reps ?? 10;
    const weight = last?.weight ?? 0;
    const s = makeSession(1, [[name, [[reps, weight, false]]]]);
    startSession(s);
  };

  const onToggleFav = async (name: string) => {
    await toggleFavorite(name);
    setFavTick((t) => t + 1);
  };

  const trackedTotal = TRACKED_EXERCISES.length;
  const catalogTotal = EXERCISE_CATALOG.length;

  return (
    <div className="px-8 pb-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            EXERCISE LIBRARY
          </div>
          <h1 className="text-5xl font-extrabold text-ink mt-2">
            Pick something to do
          </h1>
        </div>
        <div className="flex gap-3">
          <Metric label="TRACKED"   value={`${trackedTotal}`} suffix={`/${catalogTotal}`} />
          <Metric label="FAVORITES" value={String(favoriteCount())} />
        </div>
      </header>

      {/* ── Search + calibrated ────────────────────────────────── */}
      <div className="flex gap-3 items-stretch">
        <div className="flex-1 flex items-center bg-panel rounded-2xl border border-border px-4 shadow-card">
          <span className="text-gray-dark mr-2">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${catalogTotal} exercises...`}
            className="flex-1 bg-transparent outline-none py-3 text-ink placeholder:text-gray-dark"
          />
        </div>
        <div className="px-4 flex items-center bg-panel rounded-2xl border border-border shadow-card">
          <span className="w-2 h-2 rounded-full bg-good mr-2" />
          <span className="font-bold text-good text-sm">Calibrated</span>
        </div>
      </div>

      {/* ── Filter row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Pill selected={muscle === "All"} onClick={() => setMuscle("All")}>All</Pill>
        {MUSCLE_GROUPS.map((g) => (
          <Pill key={g.id} selected={muscle === g.id} onClick={() => setMuscle(g.id)}>
            {g.id}
          </Pill>
        ))}
        <span className="w-1 h-6 mx-2" />
        {EQUIPMENT_FILTERS.map((e) => (
          <Pill key={e.id} selected={equip === e.id} onClick={() => setEquip(e.id)}>
            {e.label}
          </Pill>
        ))}
        <div className="flex-1" />
        <button
          onClick={() =>
            setSortMode((s) => SORT_ORDER[(SORT_ORDER.indexOf(s) + 1) % SORT_ORDER.length])
          }
          className="px-4 py-1.5 rounded-full bg-panel border border-border text-gray-dark text-sm font-bold hover:bg-panel-dark hover:text-ink transition"
          title="Cycle sort order"
        >
          ⇅ Sort: {SORT_LABEL[sortMode]}
        </button>
      </div>

      {/* ── List ───────────────────────────────────────────────── */}
      <div className="mt-4 bg-panel rounded-2xl border border-border shadow-card divide-y divide-border">
        {visible.length === 0 && (
          <div className="p-8 text-center text-gray-dark">No matches.</div>
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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────

function Metric({ label, value, suffix }: {
  label: string; value: string; suffix?: string;
}) {
  return (
    <div className="bg-panel rounded-2xl px-5 py-3 border border-border shadow-card min-w-[120px]">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">
        {label}
      </div>
      <div className="text-2xl font-extrabold text-ink mt-1">
        {value}
        {suffix && <span className="text-gray-dark text-base font-bold ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

function Pill({ selected, onClick, children }: {
  selected: boolean; onClick(): void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-bold transition " +
        (selected
          ? "bg-nav text-white"
          : "bg-panel text-gray-dark border border-border hover:bg-panel-dark hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

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
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-panel-dark transition">
      <span
        className="w-10 h-10 rounded-full grid place-items-center font-extrabold text-ink"
        style={{ background: MUSCLE_COLORS[meta.primary] }}
      >
        {meta.name[0].toUpperCase()}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink truncate">
            {titleCase(meta.name)}
          </span>
          {tracked && (
            <span className="px-1.5 py-0.5 rounded-md bg-good/15 text-good text-[10px] font-bold tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-good" />
              CAM
            </span>
          )}
        </div>
        <div className="text-xs text-gray-dark mt-0.5">
          {meta.primary} · {meta.equipment.charAt(0).toUpperCase() + meta.equipment.slice(1)}
        </div>
      </div>

      <button
        onClick={onToggleFavorite}
        className={
          "text-xl transition " +
          (favorite ? "text-coin" : "text-border hover:text-gray-dark")
        }
        title={favorite ? "Unfavourite" : "Favourite"}
        aria-label="Toggle favourite"
      >
        {favorite ? "★" : "☆"}
      </button>

      <div className="text-right min-w-[110px]">
        <div className="text-[10px] font-bold tracking-widest text-gray-dark">BEST</div>
        <div className={"font-extrabold mt-0.5 " + (best ? "text-ink" : "text-gray-dark")}>
          {formatBest(best)}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-12 h-12 rounded-2xl bg-accent hover:bg-accent-hov text-white grid place-items-center transition"
        title={`Start ${titleCase(meta.name)}`}
        aria-label={`Start ${meta.name}`}
      >
        <PlayIcon size={14} color="#FFFFFF" />
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
