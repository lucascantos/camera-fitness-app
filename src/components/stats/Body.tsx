// Ported from: scenes/statistics.py (legacy FitnessApp repo, Body tab)
// Weight + body fat + circumference tracking, with a chart for the
// currently-selected measurement.

import { useEffect, useMemo, useState } from "react";
import {
  FIELD_LABEL,
  FIELD_UNIT,
  SIDEBAR_FIELDS,
  bmi,
  latestValue,
  loadBodyLog,
  recordMeasurement,
  seriesFor,
  type BodyField,
} from "@/data/body/body";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { LineChart } from "./charts";

export function Body() {
  const [ready, setReady] = useState(false);
  const [tick, setTick]   = useState(0);
  const [field, setField] = useState<BodyField>("weight_kg");
  const [draft, setDraft] = useState<string>("");

  useEffect(() => { loadBodyLog().then(() => setReady(true)); }, []);

  const latest = useMemo(
    () => Object.fromEntries(
      SIDEBAR_FIELDS.map((f) => [f, latestValue(f)]),
    ) as Record<BodyField, ReturnType<typeof latestValue>>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, ready],
  );

  const series = useMemo(
    () => seriesFor(field),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field, tick, ready],
  );

  const w = latest.weight_kg?.value ?? 0;
  const h = getSettings().heightCm;
  const myBmi = bmi(w, h);

  const submit = async () => {
    const n = Number(draft);
    if (!isFinite(n) || n <= 0) return;
    await recordMeasurement(field, n);
    setDraft("");
    setTick((t) => t + 1);
  };

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 px-8 pb-8">
      {/* ── Main card: header + summary tiles + chart + entry ─────── */}
      <section className="bg-panel rounded-3xl border border-border shadow-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              BODY
            </div>
            <h2 className="text-2xl font-extrabold text-ink mt-1">
              {FIELD_LABEL[field]} over time
            </h2>
          </div>
          <div className="text-xs text-gray-dark">
            {series.length} {series.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <SummaryTile
            label="WEIGHT"
            value={fmt(latest.weight_kg?.value, "kg")}
            sub={latest.weight_kg ? fmtDate(latest.weight_kg.date) : "no entry yet"}
          />
          <SummaryTile
            label="BODY FAT"
            value={fmt(latest.body_fat_pct?.value, "%")}
            sub={latest.body_fat_pct ? fmtDate(latest.body_fat_pct.date) : "no entry yet"}
          />
          <SummaryTile
            label="BMI"
            value={myBmi > 0 ? myBmi.toFixed(1) : "—"}
            sub={h > 0 ? `height ${h} cm` : "set height in settings"}
          />
        </div>

        {/* Chart */}
        <div className="mt-6 bg-bg rounded-2xl border border-border p-4">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              {FIELD_LABEL[field].toUpperCase()} TREND
            </div>
            <div className="text-xs text-gray-dark">
              {FIELD_UNIT[field]}
            </div>
          </div>
          <LineChart data={series} height={200} />
        </div>

        {/* Add measurement */}
        <div className="mt-5 bg-panel-dark rounded-2xl border border-border p-4">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
            ADD MEASUREMENT — {FIELD_LABEL[field].toUpperCase()}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`${FIELD_LABEL[field]} (${FIELD_UNIT[field]})`}
              className="flex-1 bg-panel border border-border rounded-xl px-4 py-3 text-ink outline-none focus:border-accent"
            />
            <button
              onClick={submit}
              disabled={!draft}
              className="px-5 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent-hov transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
          <div className="text-xs text-gray-dark mt-2">
            Adds to today's entry. Re-saving overwrites today's value.
          </div>
        </div>
      </section>

      {/* ── Sidebar: profile + field list ─────────────────────────── */}
      <aside className="flex flex-col gap-5">
        <ProfileCard onUpdated={() => setTick((t) => t + 1)} />

        <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
            MEASUREMENTS
          </div>
          {SIDEBAR_FIELDS.map((f) => {
            const v = latest[f];
            const on = f === field;
            return (
              <button
                key={f}
                onClick={() => setField(f)}
                className={
                  "w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 transition " +
                  (on ? "bg-panel-dark" : "hover:bg-panel-dark")
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "w-2 h-2 rounded-full " + (on ? "bg-accent" : "bg-border")
                    }
                  />
                  <span className="font-bold text-ink">{FIELD_LABEL[f]}</span>
                </div>
                <span className="text-sm text-gray-dark">
                  {v ? `${printValue(v.value)} ${FIELD_UNIT[f]}` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────

function ProfileCard({ onUpdated }: { onUpdated(): void }) {
  const s = getSettings();
  const [name,    setName]    = useState(s.name);
  const [height,  setHeight]  = useState(s.heightCm ? String(s.heightCm) : "");

  const save = async () => {
    await updateSettings({
      name,
      initials: (name.split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").join("") || "ME").slice(0, 2),
      heightCm: Number(height) || 0,
    });
    onUpdated();
  };

  return (
    <div className="bg-panel rounded-3xl border border-border shadow-card p-5">
      <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-3">
        PROFILE
      </div>
      <label className="text-xs text-gray-dark">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full mt-1 bg-panel-dark border border-border rounded-xl px-3 py-2 text-ink outline-none focus:border-accent"
      />
      <label className="text-xs text-gray-dark mt-3 block">Height (cm)</label>
      <input
        type="number"
        value={height}
        onChange={(e) => setHeight(e.target.value)}
        placeholder="e.g. 178"
        className="w-full mt-1 bg-panel-dark border border-border rounded-xl px-3 py-2 text-ink outline-none focus:border-accent"
      />
      <button
        onClick={save}
        className="w-full mt-3 py-2.5 rounded-xl bg-nav text-white font-bold hover:bg-ink transition"
      >
        Save profile
      </button>
    </div>
  );
}

function SummaryTile({
  label, value, sub,
}: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-panel-dark rounded-2xl border border-border p-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-dark">
        {label}
      </div>
      <div className="text-3xl font-extrabold text-ink mt-1">{value}</div>
      <div className="text-xs text-gray-dark mt-0.5">{sub}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function fmt(v: number | undefined, unit: string): string {
  if (v == null) return "—";
  return `${printValue(v)} ${unit}`;
}

function printValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}`;
}
