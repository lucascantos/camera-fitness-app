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
    <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            ESTIMATED 1RM
          </div>
          <div className="text-xl font-extrabold text-ink mt-1">
            {chosen ? `${titleCase(chosen)} · Epley estimate` : "—"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">
          {exercises.map((ex) => (
            <button
              key={ex}
              onClick={() => onChoose(ex)}
              className={
                "px-3 py-1 rounded-full text-xs font-bold transition " +
                (ex === chosen
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
    <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-dark">
            WEEKLY VOLUME
          </div>
          <div className="text-xl font-extrabold text-ink mt-1">
            {fmtVolume(thisWeek)} lifted this week
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
  );
}
