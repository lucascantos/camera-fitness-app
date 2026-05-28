// Tiny SVG line + bar charts. Kept in-house so we don't pull in a chart lib.

import { useMemo } from "react";

// ── Line chart ──────────────────────────────────────────────────────────
export function LineChart({
  data, width = 760, height = 180, color = "#D8202C",
}: {
  data: { date: Date; value: number }[];
  width?: number; height?: number; color?: string;
}) {
  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 22;
  const innerW = width  - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const { path, dots, yTicks, xLabels } = useMemo(() => {
    if (data.length === 0) return { path: "", dots: [], yTicks: [] as number[], xLabels: [] as { x: number; label: string }[] };
    const xs = data.map((d) => d.date.getTime());
    const ys = data.map((d) => d.value);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const yRange = yMax - yMin || 1;
    const xRange = xMax - xMin || 1;
    const mapX = (t: number) => PAD_L + ((t - xMin) / xRange) * innerW;
    const mapY = (v: number) => PAD_T + innerH - ((v - yMin) / yRange) * innerH;

    const pts = data.map((d) => ({ x: mapX(d.date.getTime()), y: mapY(d.value) }));
    const p = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const yT = [yMin, yMin + yRange / 2, yMax];
    const xL = data.length <= 1 ? [] : [
      { x: pts[0].x, label: formatTick(data[0].date) },
      { x: pts[pts.length - 1].x, label: formatTick(data[data.length - 1].date) },
    ];
    return { path: p, dots: pts, yTicks: yT, xLabels: xL };
  }, [data, innerH, innerW]);

  if (data.length === 0) {
    return <EmptyChart message="No data for this range." height={height} />;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* y-axis ticks */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_L} x2={width - PAD_R}
            y1={PAD_T + (innerH * (2 - i)) / 2}
            y2={PAD_T + (innerH * (2 - i)) / 2}
            stroke="#E2E0EA" strokeDasharray="3 3"
          />
          <text x={4} y={PAD_T + (innerH * (2 - i)) / 2 + 4}
            fontSize="10" fill="#8A8AA0" fontFamily="Inter, sans-serif">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {/* line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {/* dots */}
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
      ))}
      {/* x labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={height - 4}
          fontSize="10" fill="#8A8AA0" textAnchor="middle"
          fontFamily="Inter, sans-serif">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// ── Bar chart ───────────────────────────────────────────────────────────
export function BarChart({
  data, width = 760, height = 180, color = "#D8202C",
  highlightLast = true,
}: {
  data: { label: string; value: number }[];
  width?: number; height?: number; color?: string;
  highlightLast?: boolean;
}) {
  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 22;
  const innerW = width  - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  if (data.length === 0) {
    return <EmptyChart message="No volume data yet." height={height} />;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 8;
  const barW = Math.max(8, (innerW - gap * (data.length - 1)) / data.length);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* baseline */}
      <line x1={PAD_L} x2={width - PAD_R}
            y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="#E2E0EA" />
      {/* bars */}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = PAD_L + i * (barW + gap);
        const y = PAD_T + innerH - h;
        const isLast = highlightLast && i === data.length - 1;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={Math.max(2, h)}
              rx={6}
              fill={isLast ? color : "#1A1330"}
              opacity={isLast ? 1 : 0.85}
            />
            <text x={x + barW / 2} y={height - 4}
              fontSize="10" fill="#8A8AA0" textAnchor="middle"
              fontFamily="Inter, sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
      {/* y-axis max */}
      <text x={4} y={PAD_T + 8} fontSize="10" fill="#8A8AA0"
        fontFamily="Inter, sans-serif">
        {Math.round(max)}
      </text>
    </svg>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
function EmptyChart({ message, height }: { message: string; height: number }) {
  return (
    <div className="grid place-items-center text-gray-dark text-sm"
         style={{ height }}>
      {message}
    </div>
  );
}

// ── Tick formatter ──────────────────────────────────────────────────────
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatTick(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
