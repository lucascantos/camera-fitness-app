// Tiny shared icon set so every Start button renders the same triangle
// regardless of Tailwind's border-width quirks.

export function BackIcon({
  size = 20,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ── Bottom-nav icons ───────────────────────────────────────────────────────
// Simple 24px outline glyphs, stroked with currentColor so the active tab
// picks up `text-accent` and the rest stay `text-gray-dark`.

function NavSvg({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </NavSvg>
  );
}

export function PlansIcon({ size = 22 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </NavSvg>
  );
}

export function ExercisesIcon({ size = 22 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M12 5v14M5 12h14" />
    </NavSvg>
  );
}

export function StatsIcon({ size = 22 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M12 4 21 19H3z" />
    </NavSvg>
  );
}

export function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </NavSvg>
  );
}

export function DojoIcon({ size = 18 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M12 2L5 8v2l7 5 7-5V8z" />
      <path d="M5 13v2l7 5 7-5v-2" />
    </NavSvg>
  );
}

export function FilterIcon({ size = 18 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </NavSvg>
  );
}

export function SortIcon({ size = 16 }: { size?: number }) {
  return (
    <NavSvg size={size}>
      <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l3 3M17 20l-3-3" />
    </NavSvg>
  );
}

export function PlayIcon({
  size = 14,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  // 12-wide × 14-tall triangle pointing right.
  const w = size;
  const h = Math.round((size * 14) / 12);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 12 14"
      fill={color}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polygon points="0,0 12,7 0,14" />
    </svg>
  );
}
