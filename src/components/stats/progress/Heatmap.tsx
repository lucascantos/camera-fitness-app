// GitHub-style activity grid: weeks × 7 days, oldest column first.

import type { activityGrid } from "@/data/stats/progress";

const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function Heatmap({ grid }: { grid: ReturnType<typeof activityGrid> }) {
  const cell = 12;
  const gap  = 3;
  const w = grid.length * (cell + gap);
  const h = 7 * (cell + gap);
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
          if (!first || first.getDate() > 7) return null;
          return (
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
          );
        })}
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
