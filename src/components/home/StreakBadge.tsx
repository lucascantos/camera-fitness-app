// Home header: the weekly streak plus this week's progress toward the goal.
// One pip per training day the athlete aims for; filled pips are days done.

import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import { weeklyStreak } from "@/data/stats/weeklyStreak";
import { FlameIcon } from "@/components/icons";

export function StreakBadge() {
  const { weeks, thisWeek, goal } = weeklyStreak(
    getAthlete().history, getSettings().weeklyGoal);
  const lit = weeks > 0;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={
          "w-11 h-11 rounded-full grid place-items-center shrink-0 " +
          (lit ? "bg-accent text-on_accent" : "bg-panel border border-border text-gray-dark")
        }
      >
        <FlameIcon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-ink leading-tight">
          {weeks} {weeks === 1 ? "week" : "weeks"}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: goal }, (_, i) => (
              <span
                key={i}
                className={"w-2 h-2 rounded-full " + (i < thisWeek ? "bg-good" : "bg-border")}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-gray-dark">
            {Math.min(thisWeek, goal)}/{goal} this week
          </span>
        </div>
      </div>
    </div>
  );
}
