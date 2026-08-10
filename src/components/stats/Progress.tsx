// Ported from: scenes/statistics.py (legacy FitnessApp repo, Progress tab)

import { useMemo, useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import {
  activityGrid,
  filterByRange,
  formatRangeLabel,
  oneRmSeries,
  progressionRows,
  topExercisesByRecentVolume,
  weeklyVolume,
  RANGE_SESSION_GOAL,
  type TimeRange,
} from "@/data/stats/progress";
import { headlineCopy, headlineStats } from "@/data/stats/headline";
import { fmtVolume, titleCase } from "@/lib/format";
import { DeltaBadge, Tile } from "./progress/parts";
import { Heatmap } from "./progress/Heatmap";
import { OneRmCard, WeeklyVolumeCard } from "./progress/ChartCards";

const RANGE_PILLS: TimeRange[] = ["W", "M", "3M", "Y", "All"];

// The canonical "big 5" lifts — always shown in the Estimated 1RM pill row,
// even when there's no history yet, so the chart picker matches the legacy
// screenshot.
const MAIN_LIFTS = [
  "bench press",
  "deadlift",
  "squat",
  "overhead press",
  "barbell row",
] as const;

export function Progress() {
  const [range, setRange] = useState<TimeRange>("3M");
  const history = getAthlete().history;

  const filtered = useMemo(() => filterByRange(history, range), [history, range]);
  const heat     = useMemo(() => activityGrid(history, 12), [history]);
  const top5     = useMemo(() => topExercisesByRecentVolume(filtered, 5), [filtered]);
  const stats    = useMemo(() => {
    const s = headlineStats(history, filtered);
    s.sessions.goal = RANGE_SESSION_GOAL[range];
    return s;
  }, [history, filtered, range]);
  const headline = useMemo(() => headlineCopy(stats), [stats]);
  const weekly   = useMemo(() => weeklyVolume(filtered), [filtered]);
  const progRows = useMemo(() => progressionRows(history, filtered, 4), [history, filtered]);

  const [chartExercise, setChartExercise] = useState<string | null>(null);
  // Always show the 5 main lifts; append any non-main exercises that have
  // recent volume so accessory work still appears once it's done.
  const exercisesForChart = useMemo(() => {
    const out: string[] = [...MAIN_LIFTS];
    for (const ex of top5) if (!out.includes(ex)) out.push(ex);
    return out;
  }, [top5]);
  const chosenExercise =
    chartExercise && exercisesForChart.includes(chartExercise)
      ? chartExercise
      : exercisesForChart[0] ?? null;

  const rmPoints = useMemo(
    () => (chosenExercise ? oneRmSeries(filtered, chosenExercise) : []),
    [filtered, chosenExercise],
  );

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 px-8 pb-8">
      {/* ── Centre column ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-end -mt-2">
          <div className="flex bg-panel rounded-full p-1 border border-border shadow-card">
            {RANGE_PILLS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={
                  "px-3.5 py-1 rounded-full text-sm font-bold transition " +
                  (range === r ? "bg-nav text-white" : "text-gray-dark hover:text-ink")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <h1 className="text-5xl font-extrabold text-ink">{headline}</h1>
          <div className="text-sm text-gray-dark">{formatRangeLabel(filtered)}</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Tile
            label="EST. 1RM"
            value={stats.est1RM.value > 0 ? `${Math.round(stats.est1RM.value)} kg` : "—"}
            sub={stats.est1RM.exercise !== "—" ? titleCase(stats.est1RM.exercise) : ""}
            delta={stats.est1RM.delta}
            deltaUnit=" kg"
          />
          <Tile
            label="VOLUME / WK"
            value={fmtVolume(stats.volumeWk.value)}
            delta={stats.volumeWk.delta}
            deltaFmt={fmtVolume}
          />
          <Tile
            label="SESSIONS"
            value={String(stats.sessions.value)}
            sub={`/ ${stats.sessions.goal} goal`}
          />
          <Tile
            label="STREAK"
            value={`${stats.streak.weeks} wks`}
            sub={`longest: ${stats.streak.longest}`}
          />
        </div>

        <OneRmCard
          points={rmPoints}
          exercises={exercisesForChart}
          chosen={chosenExercise}
          onChoose={setChartExercise}
        />

        <WeeklyVolumeCard
          weekly={weekly}
          thisWeek={stats.volumeWk.value}
          range={range}
        />
      </section>

      {/* ── Right sidebar ─────────────────────────────────────────── */}
      <aside className="flex flex-col gap-5 mt-9">
        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              ACTIVITY
            </div>
            <div className="text-xs text-gray-dark">
              {filtered.entries.length} sessions
            </div>
          </div>
          <Heatmap grid={heat} />
        </div>

        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
            PROGRESSION
          </div>
          {progRows.length === 0 && (
            <div className="text-sm text-gray-dark">No progression to show yet.</div>
          )}
          {progRows.map((r) => (
            <div key={r.exercise} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="font-bold text-ink truncate">{titleCase(r.exercise)}</div>
                <div className="text-xs text-gray-dark">
                  {r.best > 0 ? `${Math.round(r.best)} kg · PR ${r.daysAgo}d ago` : "—"}
                </div>
              </div>
              <DeltaBadge delta={r.deltaKg} />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
