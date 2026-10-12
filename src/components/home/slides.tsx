// The Home billboard's text slides. Every slide shares one white frame of a
// fixed height, so the page never jumps while the billboard rotates.

import type { ReactNode } from "react";
import type { Verdict } from "@/data/stats/verdict";
import { fmtDate } from "@/data/stats/dates";
import { titleCase } from "@/lib/format";
import type { BestNews, LatestNews, MonthNews } from "./news";

export function SlideFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-panel border border-border rounded-3xl p-5 h-[212px] flex flex-col shadow-card">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark">{label}</div>
      <div className="flex-1 flex flex-col mt-2 min-h-0">{children}</div>
    </div>
  );
}

export function MonthSlide({ m }: { m: MonthNews }) {
  const pct = Math.min(1, m.target ? m.days / m.target : 0);
  const done = m.days >= m.target;
  return (
    <SlideFrame label="THIS MONTH">
      <div className="text-4xl font-extrabold text-ink leading-none">
        {m.days}<span className="text-gray-dark text-2xl"> / {m.target}</span>
      </div>
      <div className="text-sm text-gray-dark mt-1">training days in {m.monthName}</div>
      <div className="h-2.5 rounded-full bg-panel-dark mt-auto overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={"text-sm font-semibold mt-2 " + (done ? "text-good" : "text-gray-dark")}>
        {done ? "Monthly target reached" : `${m.daysLeft} days left this month`}
      </div>
    </SlideFrame>
  );
}

const MARK: Record<Verdict["kind"], { mark: string; color: string }> = {
  progress: { mark: "▲", color: "text-good" },
  holding:  { mark: "=", color: "text-ink" },
  below:    { mark: "▼", color: "text-gray-dark" },
};

export function LatestSlide({ l }: { l: LatestNews }) {
  const shown = l.rows.slice(0, 3);
  const more = l.rows.length - shown.length;
  return (
    <SlideFrame label={`LAST WORKOUT · ${fmtDate(l.date).toUpperCase()}`}>
      <div className="flex flex-col gap-2.5 mt-1">
        {shown.map(({ exercise, verdict }) => {
          const look = verdict ? MARK[verdict.kind] : null;
          return (
            <div key={exercise} className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-ink truncate">{titleCase(exercise)}</span>
              <span className={"text-sm font-semibold shrink-0 " + (look ? look.color : "text-coin-dim")}>
                {look ? `${look.mark} ${verdict!.reason}` : "★ First time"}
              </span>
            </div>
          );
        })}
      </div>
      {more > 0 && <div className="text-sm text-gray-dark mt-auto">+{more} more</div>}
    </SlideFrame>
  );
}

export function BestSlide({ b }: { b: BestNews }) {
  const what = b.weight > 0 ? `${b.weight} kg × ${b.reps}` : `${b.reps} reps`;
  return (
    <SlideFrame label="NEW PERSONAL BEST">
      <div className="text-coin text-4xl leading-none">★</div>
      <div className="text-2xl font-extrabold text-ink mt-auto truncate">{titleCase(b.exercise)}</div>
      <div className="text-sm text-gray-dark mt-1">{what} · {fmtDate(b.date)}</div>
    </SlideFrame>
  );
}

export function WelcomeSlide() {
  return (
    <SlideFrame label="WELCOME">
      <div className="text-2xl font-extrabold text-ink leading-tight mt-1">
        Your first workout starts the story
      </div>
      <div className="text-sm text-gray-dark mt-auto">
        Your progress, personal bests and body stats will show up here.
      </div>
    </SlideFrame>
  );
}
