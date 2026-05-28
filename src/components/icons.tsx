// Tiny shared icon set so every Start button renders the same triangle
// regardless of Tailwind's border-width quirks.

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
