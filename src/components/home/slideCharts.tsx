// The Home billboard's chart slides: training days per week against the
// weekly goal, and the body trend. Plain SVG sized by viewBox, coloured
// through the theme tokens so both themes work.

import { FIELD_LABEL, FIELD_UNIT } from "@/data/body/body";
import { SlideFrame } from "./slides";
import type { BodyNews, WeeksNews } from "./news";

export function WeeksSlide({ w }: { w: WeeksNews }) {
  const top = Math.max(w.goal, ...w.counts, 1);
  const H = 70, BAR = 22, GAP = 12;
  const width = w.counts.length * (BAR + GAP) - GAP;
  const y = (v: number) => H - (v / top) * H;
  const atGoal = w.counts.filter((c) => c >= w.goal).length;

  return (
    <SlideFrame label={`LAST ${w.counts.length} WEEKS`}>
      <div className="text-ink">
        <span className="text-2xl font-extrabold">{atGoal}</span>
        <span className="text-sm text-gray-dark font-semibold"> of {w.counts.length} weeks at your goal</span>
      </div>
      <svg viewBox={`0 -4 ${width} ${H + 8}`} className="w-full mt-auto h-[84px]" preserveAspectRatio="none">
        {w.counts.map((c, i) => {
          const isNow = i === w.counts.length - 1;
          const cls = c >= w.goal ? "fill-good" : isNow ? "fill-accent" : "fill-gray";
          return (
            <rect
              key={i} x={i * (BAR + GAP)} width={BAR} rx={4}
              y={c ? y(c) : H - 3} height={c ? H - y(c) : 3}
              className={cls} opacity={c ? 1 : 0.35}
            />
          );
        })}
        <line
          x1={0} x2={width} y1={y(w.goal)} y2={y(w.goal)}
          className="stroke-ink" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </SlideFrame>
  );
}

export function BodySlide({ b }: { b: BodyNews }) {
  const unit = FIELD_UNIT[b.field];
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const lo = Math.min(...b.series), hi = Math.max(...b.series);
  const span = hi - lo || 1;
  const pts = b.series
    .map((v, i) => `${(i / Math.max(1, b.series.length - 1)) * 100},${40 - ((v - lo) / span) * 36 - 2}`)
    .join(" ");

  return (
    <SlideFrame label={`BODY · ${FIELD_LABEL[b.field].toUpperCase()}`}>
      <div className="text-4xl font-extrabold text-ink leading-none">
        {fmt(b.value)}<span className="text-xl text-gray-dark"> {unit}</span>
      </div>
      <div className="text-sm text-gray-dark font-semibold mt-1">
        {b.delta === null
          ? "First measurement"
          : b.delta === 0
          ? "No change in 30 days"
          : `${b.delta > 0 ? "+" : "−"}${fmt(Math.abs(b.delta))} ${unit} in 30 days`}
      </div>
      {b.series.length > 1 && (
        <svg viewBox="0 0 100 40" className="w-full h-[56px] mt-auto" preserveAspectRatio="none">
          <polyline
            points={pts} fill="none" className="stroke-accent" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </SlideFrame>
  );
}
