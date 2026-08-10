// One exercise in the library list.

import { MUSCLE_COLORS, type ExerciseMeta } from "@/data/exercises/catalog";
import { formatBest, type BestSet } from "@/data/athlete/bestSet";
import { PlayIcon } from "@/components/icons";
import { titleCase } from "@/lib/format";

export function Row({
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
