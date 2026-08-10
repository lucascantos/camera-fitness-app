// Formatting helpers shared across screens. These were duplicated verbatim in
// most components; one copy keeps "24.5k kg" reading the same everywhere.

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Total lifted load, abbreviated past a tonne. */
export function fmtVolume(kg: number): string {
  if (kg <= 0) return "0 kg";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}
