// Metric tile and progression delta badge for the Progress tab.

export function Tile({ label, value, sub, delta, deltaUnit, deltaFmt }: {
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

export function DeltaBadge({ delta }: { delta: number }) {
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
