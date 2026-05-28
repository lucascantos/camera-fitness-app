// Ported from: data/body.py (legacy FitnessApp repo)
// Time-series of body measurements, persisted via IndexedDB.

import { kvGet, kvSet } from "@/data/db";

export type BodyField =
  | "weight_kg"
  | "body_fat_pct"
  | "neck_cm"
  | "chest_cm"
  | "waist_cm"
  | "hips_cm"
  | "biceps_cm"
  | "thigh_cm";

export const FIELD_LABEL: Record<BodyField, string> = {
  weight_kg:    "Weight",
  body_fat_pct: "Body fat",
  neck_cm:      "Neck",
  chest_cm:     "Chest",
  waist_cm:     "Waist",
  hips_cm:      "Hips",
  biceps_cm:    "Biceps",
  thigh_cm:     "Thigh",
};

export const FIELD_UNIT: Record<BodyField, string> = {
  weight_kg: "kg", body_fat_pct: "%", neck_cm: "cm", chest_cm: "cm",
  waist_cm: "cm", hips_cm: "cm", biceps_cm: "cm", thigh_cm: "cm",
};

/** Field order in the sidebar / form. */
export const SIDEBAR_FIELDS: BodyField[] = [
  "weight_kg", "body_fat_pct",
  "neck_cm", "chest_cm", "waist_cm", "hips_cm",
  "biceps_cm", "thigh_cm",
];

export interface BodyEntry {
  date: string;                            // YYYY-MM-DD
  values: Partial<Record<BodyField, number>>;
}

export interface BodyLog {
  entries: BodyEntry[];
}

let _log: BodyLog = { entries: [] };

export async function loadBodyLog(): Promise<BodyLog> {
  const stored = await kvGet<BodyLog>("body_log");
  if (stored && Array.isArray(stored.entries)) _log = stored;
  return _log;
}

export function getBodyLog(): BodyLog {
  return _log;
}

export async function saveBodyLog(): Promise<void> {
  await kvSet("body_log", _log);
}

/** Insert or update a single field on today's entry. */
export async function recordMeasurement(field: BodyField, value: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  let entry = _log.entries.find((e) => e.date === today);
  if (!entry) {
    entry = { date: today, values: {} };
    _log.entries.push(entry);
  }
  entry.values[field] = value;
  // Keep ordered chronologically.
  _log.entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveBodyLog();
}

/** Most recent value for `field`, or null if never recorded. */
export function latestValue(field: BodyField): { value: number; date: string } | null {
  for (let i = _log.entries.length - 1; i >= 0; i--) {
    const v = _log.entries[i].values[field];
    if (v != null) return { value: v, date: _log.entries[i].date };
  }
  return null;
}

/** Chronological series of values for one field, oldest first. */
export function seriesFor(field: BodyField): { date: Date; value: number }[] {
  const out: { date: Date; value: number }[] = [];
  for (const e of _log.entries) {
    const v = e.values[field];
    if (v == null) continue;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date);
    if (!m) continue;
    out.push({
      date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
      value: v,
    });
  }
  return out;
}

/** BMI = weight_kg / (height_m)^2 — height comes from settings. */
export function bmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const m = heightCm / 100;
  return weightKg / (m * m);
}
