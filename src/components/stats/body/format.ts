const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function printValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function fmt(v: number | undefined, unit: string): string {
  if (v == null) return "—";
  return `${printValue(v)} ${unit}`;
}

export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}`;
}
