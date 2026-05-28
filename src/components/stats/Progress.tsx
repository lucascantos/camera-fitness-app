// Ported from: scenes/statistics.py (legacy FitnessApp repo, Progress tab)

import { useMemo, useState } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import {
  filterByRange,
  formatRangeLabel,
  headlineCopy,
  headlineStats,
  oneRmSeries,
  progressionRows,
  topExercisesByRecentVolume,
  weeklyVolume,
  RANGE_SESSION_GOAL,
  type TimeRange,
} from "@/data/stats/progress";
import { LineChart, BarChart } from "./charts";
import { activityGrid } from "@/data/stats/progress";

const RANGE_PILLS: TimeRange[] = ["W", "M", "3M", "Y", "All"];

const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const exercisesForChart = top5.length > 0 ? top5 : [];
  const chosenExercise = chartExercise && exercisesForChart.includes(chartExercise)
    ? chartExercise
    : (exercisesForChart[0] ?? null);

  const rmPoints = useMemo(
    () => (chosenExercise ? oneRmSeries(filtered, chosenExercise) : []),
    [filtered, chosenExercise],
  );

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 px-8 pb-8">
      {/* ── Centre column ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        {/* Time range pills (top-right of the centre col) */}
        <div className="flex items-center justify-end -mt-2">
          <div className="flex bg-panel rounded-full p-1 border border-border shadow-card">
            {RANGE_PILLS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={
                  "px-3.5 py-1 rounded-full text-sm font-bold transition " +
                  (range === r
                    ? "bg-nav text-white"
                    : "text-gray-dark hover:text-ink")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Headline + date range */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-5xl font-extrabold text-ink">{headline}</h1>
          <div className="text-sm text-gray-dark">
            {formatRangeLabel(filtered)}
          </div>
        </div>

        {/* Metric tiles row */}
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

        {/* Estimated 1RM chart */}
        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-gray-dark">
                ESTIMATED 1RM
              </div>
              <div className="text-xl font-extrabold text-ink mt-1">
                {chosenExercise ? `${titleCase(chosenExercise)} · Epley estimate` : "—"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">
              {exercisesForChart.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setChartExercise(ex)}
                  className={
                    "px-3 py-1 rounded-full text-xs font-bold transition " +
                    (ex === chosenExercise
                      ? "bg-nav text-white"
                      : "bg-panel-dark text-gray-dark border border-border hover:text-ink")
                  }
                >
                  {titleCase(ex)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <LineChart
              data={rmPoints.map((p) => ({ date: p.date, value: p.estimate }))}
              height={200}
            />
          </div>
        </div>

        {/* Weekly volume bar chart */}
        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-gray-dark">
                WEEKLY VOLUME
              </div>
              <div className="text-xl font-extrabold text-ink mt-1">
                {fmtVolume(stats.volumeWk.value)} lifted this week
              </div>
            </div>
            <div className="text-xs text-gray-dark">
              {range} · TAP A BAR TO INSPECT
            </div>
          </div>
          <div className="mt-3">
            <BarChart
              data={weekly.map((w, i, arr) => ({
                label: i === arr.length - 1 ? "This wk" : `W${weekNo(w.weekStart)}`,
                value: w.volume,
              }))}
              height={180}
            />
          </div>
        </div>
      </section>

      {/* ── Right sidebar ─────────────────────────────────────────── */}
      <aside className="flex flex-col gap-5 mt-9">
        {/* Activity heatmap */}
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

        {/* Progression list */}
        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
            PROGRESSION
          </div>
          {progRows.length === 0 && (
            <div className="text-sm text-gray-dark">
              No progression to show yet.
            </div>
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

// ──────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────

function Tile({ label, value, sub, delta, deltaUnit, deltaFmt }: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  deltaUnit?: string;
  deltaFmt?: (n: number) => string;
}) {
  const showDelta = delta !== undefined && Math.abs(delta) > 0.5;
  const arrow = (delta ?? 0) > 0 ? "▲" : (delta ?? 0) < 0 ? "▼" : "·";
  const color = (delta ?? 0) > 0 ? "text-good" : (delta ?? 0) < 0 ? "text-accent" : "text-gray-dark";
  const printed = showDelta
    ? (deltaFmt ? deltaFmt(Math.abs(delta!)) : `${Math.abs(delta!).toFixed(1)}${deltaUnit ?? ""}`)
    : null;
  return (
    <div className="bg-panel rounded-2xl border border-border shadow-card p-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">
        {label}
      </div>
      <div className="text-3xl font-extrabold text-ink mt-1">
        {value}
      </div>
      {sub && <div className="text-xs text-gray-dark mt-0.5">{sub}</div>}
      {printed && (
        <div className={`text-xs font-bold mt-1 ${color}`}>
          {arrow} {printed}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) {
    return <div className="text-xs text-gray-dark">+0.0 kg</div>;
  }
  const color = delta > 0 ? "text-good" : "text-accent";
  const sign  = delta > 0 ? "+" : "−";
  return (
    <div className={`text-xs font-bold ${color}`}>
      {sign}{Math.abs(delta).toFixed(1)} kg
    </div>
  );
}

function Heatmap({ grid }: { grid: ReturnType<typeof activityGrid> }) {
  // grid is weeks × 7 days, oldest first.
  const cell = 12;
  const gap  = 3;
  const w = grid.length * (cell + gap);
  const h = 7      * (cell + gap);
  const today = new Date();
  return (
    <div className="mt-3 flex items-start gap-2">
      {/* weekday labels */}
      <div className="flex flex-col gap-[3px] pt-3 mr-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d}
            className={"text-[9px] " + (i % 2 ? "text-transparent" : "text-gray-dark")}>
            {d.slice(0, 1)}
          </div>
        ))}
      </div>
      <svg width={w} height={h + 14}>
        {/* month labels along the top */}
        {grid.map((col, i) => {
          const first = col[0]?.date;
          if (!first) return null;
          const showMonth = first.getDate() <= 7;
          return showMonth ? (
            <text
              key={`m${i}`}
              x={i * (cell + gap)}
              y={9}
              fontSize="9"
              fill="#8A8AA0"
              fontFamily="Inter, sans-serif"
            >
              {MONTHS_SHORT[first.getMonth()]}
            </text>
          ) : null;
        })}
        {/* cells */}
        {grid.map((col, ci) =>
          col.map((c, ri) => {
            const future = c.date > today;
            const filled = c.count > 0;
            return (
              <rect
                key={`${ci}-${ri}`}
                x={ci * (cell + gap)}
                y={14 + ri * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill={future ? "#F3F2F8" : filled ? "#D8202C" : "#EDECF2"}
                opacity={filled && c.count > 1 ? 1 : (filled ? 0.9 : 1)}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtVolume(kg: number): string {
  if (kg <= 0) return "0 kg";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

function weekNo(d: Date): number {
  const first = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - first.getTime()) / (7 * 86400000)) + 1;
}
