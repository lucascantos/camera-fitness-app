// The two chart panels in the Progress centre column.

import type { OneRmPoint, WeeklyVolumePoint } from "@/data/stats/progress";
import { fmtVolume, titleCase } from "@/lib/format";
import { BarChart, LineChart } from "../charts";

function weekNo(d: Date): number {
  const first = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - first.getTime()) / (7 * 86400000)) + 1;
}

export function OneRmCard({ points, exercises, chosen, onChoose }: {
  points: OneRmPoint[];
  exercises: string[];
  chosen: string | null;
  onChoose(ex: string): void;
}) {
  return (
    <div className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-5 min-w-0">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark">
        ESTIMATED 1RM
      </div>
      <div className="text-xl font-extrabold text-ink mt-1 truncate">
        {chosen ? titleCase(chosen) : "—"}
        <span className="text-sm font-semibold text-gray-dark"> · Epley estimate</span>
      </div>
      {/* One scrolling row of lifts on a phone; wraps on wider screens. */}
      <div className="flex gap-2 mt-3 -mx-4 px-4 overflow-x-auto lg:mx-0 lg:px-0 lg:flex-wrap [scrollbar-width:none]">
        {exercises.map((ex) => (
          <button
            key={ex}
            onClick={() => onChoose(ex)}
            className={
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition " +
                (ex === chosen
                  ? "bg-nav text-white"
                  : "bg-panel-dark text-gray-dark border border-border hover:text-ink")
              }
            >
            {titleCase(ex)}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <LineChart
          data={points.map((p) => ({ date: p.date, value: p.estimate }))}
          height={200}
        />
      </div>
    </div>
  );
}

export function WeeklyVolumeCard({ weekly, thisWeek, range }: {
  weekly: WeeklyVolumePoint[];
  thisWeek: number;
  range: string;
}) {
  return (
    <div className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          WEEKLY VOLUME
        </div>
        <div className="text-xs font-bold text-gray-dark">{range}</div>
      </div>
      <div className="text-xl font-extrabold text-ink mt-1">
        {fmtVolume(thisWeek)} lifted this week
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
  );
}
