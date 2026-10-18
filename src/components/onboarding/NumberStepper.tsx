// A big number field with up/down arrows beside it that add or take away 1.
// Holding an arrow repeats, speeding up, so 70 → 95 doesn't take 25 taps.
// The number can also be typed directly.
//
// TODO(units): metric only for now (kg, cm). Add an imperial option later —
// see the "Units setting" item in the project backlog.

import { useRef } from "react";

const FIRST_REPEAT_MS = 400;
const REPEAT_MS = 70;

export function NumberStepper({ label, unit, value, min, max, onChange }: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange(v: number): void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(value);
  latest.current = value;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const stop = () => clearTimeout(timer.current);
  const start = (delta: number) => {
    stop();
    const step = (wait: number) => {
      onChange(clamp(Math.round(latest.current) + delta));
      timer.current = setTimeout(() => step(REPEAT_MS), wait);
    };
    step(FIRST_REPEAT_MS);
  };

  const arrow = (delta: number, glyph: string, name: string) => (
    <button
      type="button"
      aria-label={`${name} ${label.toLowerCase()} by 1 ${unit}`}
      onPointerDown={(e) => { e.preventDefault(); start(delta); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(clamp(value + delta)); }}
      className="flex-1 w-16 rounded-2xl bg-panel-dark text-ink text-2xl grid place-items-center active:bg-border transition select-none"
    >
      {glyph}
    </button>
  );

  return (
    <div>
      <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">{label.toUpperCase()}</div>
      <div className="flex gap-3 h-36">
        <label className="flex-1 min-w-0 rounded-3xl border-2 border-border bg-panel flex items-baseline justify-center gap-2 px-4 focus-within:border-accent transition">
          <input
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : ""}
            min={min}
            max={max}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={() => onChange(clamp(Number.isFinite(value) ? value : min))}
            aria-label={`${label} in ${unit}`}
            className="w-full min-w-0 self-center bg-transparent text-6xl font-extrabold text-ink text-center tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="self-center text-xl font-bold text-gray-dark shrink-0">{unit}</span>
        </label>
        <div className="flex flex-col gap-2">
          {arrow(1, "▲", "Increase")}
          {arrow(-1, "▼", "Decrease")}
        </div>
      </div>
    </div>
  );
}
