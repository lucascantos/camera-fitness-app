// Ported from: scenes/statistics.py (legacy FitnessApp repo, Body Map tab)
// Two figures (front + back) with muscle regions heat-tinted by rep volume.
// Hover (desktop) or tap (phone) a muscle to select it: it's outlined on the
// figure, read out under the figures, and highlighted in the rank list. The
// silhouette itself lives in ./bodymap/figure.

import { useMemo, useState } from "react";
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  muscleRanking,
  muscleRepCounts,
  neglectedMuscles,
} from "@/data/stats/bodyMap";
import { FigurePanel, HeatLegend, MuscleReadout, RankRow } from "./bodymap/parts";

export function BodyMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = useMemo(() => muscleRepCounts(), []);
  const ranking = useMemo(() => muscleRanking(counts), [counts]);
  const neglect = useMemo(() => neglectedMuscles(counts, 5), [counts]);
  const maxReps = ranking[0]?.reps ?? 0;

  return (
    // Phone first: one column. From lg up, the lists sit in a sidebar.
    <div className="flex flex-col gap-4 px-4 pb-6 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:px-8 lg:pb-8">
      {/* ── Figures ─────────────────────────────────────────────── */}
      <section className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-6 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              MUSCLE FREQUENCY
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-ink mt-1">
              Tap a muscle to inspect
            </h2>
          </div>
          <HeatLegend />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:gap-6 mt-4">
          <FigurePanel
            title="FRONT"
            tint="#FFE9E9"
            regions={FRONT_MUSCLES}
            counts={counts}
            maxReps={maxReps}
            hovered={hovered}
            onHover={setHovered}
            front
          />
          <FigurePanel
            title="BACK"
            tint="#EDECF2"
            regions={BACK_MUSCLES}
            counts={counts}
            maxReps={maxReps}
            hovered={hovered}
            onHover={setHovered}
          />
        </div>

        <MuscleReadout muscle={hovered} ranking={ranking} />
      </section>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-4 lg:gap-5 min-w-0">
        <div className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
            RANKING
          </div>
          <div className="lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
            {ranking.map((r) => (
              <RankRow
                key={r.muscle}
                muscle={r.muscle}
                reps={r.reps}
                max={maxReps}
                highlighted={hovered === r.muscle}
                onHover={setHovered}
              />
            ))}
          </div>
        </div>

        <div className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-5">
          <div className="text-[11px] font-bold tracking-widest text-accent mb-3">
            NEEDS ATTENTION
          </div>
          {neglect.map((n) => (
            <div
              key={n.muscle}
              onMouseEnter={() => setHovered(n.muscle)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(n.muscle)}
              className={
                "flex items-center justify-between py-1.5 rounded-lg px-2 cursor-default transition " +
                (hovered === n.muscle ? "bg-panel-dark" : "")
              }
            >
              <span className="text-ink font-bold">{n.muscle}</span>
              <span className="text-xs text-gray-dark">
                {n.reps === 0 ? "no reps yet" : `${n.reps} reps`}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
