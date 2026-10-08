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
import { getSettings } from "@/data/settings/settings";
import { LineChart } from "./charts";
import { ProfileCard, SummaryTile } from "./body/parts";
import { fmt, fmtDate, printValue } from "./body/format";

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
    // Phone first: one column, with the measurement picker as a chip row. From
    // lg up, the picker becomes a sidebar list beside the main card.
    <div className="flex flex-col gap-4 px-4 pb-6 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:px-8 lg:pb-8">
      {/* ── Main card: header + summary tiles + chart + entry ─────── */}
      <section className="bg-panel rounded-3xl border border-border shadow-card p-4 lg:p-6 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              BODY
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-ink mt-1 truncate">
              {FIELD_LABEL[field]} over time
            </h2>
          </div>
          <div className="text-xs text-gray-dark shrink-0">
            {series.length} {series.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3 mt-4 lg:mt-5">
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

        {/* Measurement picker — phone only; the sidebar list takes over on lg. */}
        <div className="lg:hidden flex gap-2 mt-4 -mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
          {SIDEBAR_FIELDS.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition " +
                (f === field
                  ? "bg-nav text-white"
                  : "bg-panel-dark text-gray-dark border border-border")
              }
            >
              {FIELD_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="mt-4 lg:mt-6 bg-bg rounded-2xl border border-border p-3 lg:p-4">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <div className="text-[11px] font-bold tracking-widest text-gray-dark">
              {FIELD_LABEL[field].toUpperCase()} TREND
            </div>
            <div className="text-xs text-gray-dark">
              {FIELD_UNIT[field]}
            </div>
          </div>
          <LineChart
            data={series}
            height={200}
            emptyMessage="Add a measurement below to start your trend."
          />
        </div>

        {/* Add measurement */}
        <div className="mt-4 lg:mt-5 bg-panel-dark rounded-2xl border border-border p-3 lg:p-4">
          <div className="text-[11px] font-bold tracking-widest text-gray-dark mb-2">
            ADD {FIELD_LABEL[field].toUpperCase()}
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <input
              type="number"
              step="0.1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`${FIELD_LABEL[field]} (${FIELD_UNIT[field]})`}
              inputMode="decimal"
              className="flex-1 min-w-0 bg-panel border border-border rounded-xl px-4 py-3 text-ink outline-none focus:border-accent"
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
      <aside className="flex flex-col gap-4 lg:gap-5 min-w-0">
        <ProfileCard onUpdated={() => setTick((t) => t + 1)} />

        <div className="hidden lg:block bg-panel rounded-3xl border border-border shadow-card p-5">
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
