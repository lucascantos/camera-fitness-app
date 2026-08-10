// Sidebar profile editor and the summary tiles above the Body chart.

import { useState } from "react";
import { getSettings, updateSettings } from "@/data/settings/settings";

export function ProfileCard({ onUpdated }: { onUpdated(): void }) {
  const s = getSettings();
  const [name,   setName]   = useState(s.name);
  const [height, setHeight] = useState(s.heightCm ? String(s.heightCm) : "");

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

export function SummaryTile({ label, value, sub }: {
  label: string; value: string; sub: string;
}) {
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
