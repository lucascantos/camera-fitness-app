// Ported from: scenes/settings_overlay.py (legacy FitnessApp repo)
// Rendered as a full page here instead of an overlay.

import { useState } from "react";
import { getSettings, updateSettings, type Theme } from "@/data/settings/settings";
import { applyMusicVolume } from "@/audio/music";
import { repBeep, setCompleteChime } from "@/audio/sfx";
import { playVoice } from "@/audio/voice";
import { say } from "@/data/trainers/say";

const THEMES: Theme[] = ["fitpop", "light", "dark"];
const WEIGHT_STEPS = [0.5, 1.0, 2.5, 5.0];
const REST_STEPS = [30, 60, 90, 120, 180];

export function Settings() {
  const [, force] = useState({});
  const s = getSettings();
  const set = async (patch: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(patch);
    force({});
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-extrabold mb-6">Settings</h1>

      <Slider
        label="Music"
        value={s.musicVol}
        onChange={async (v) => { await set({ musicVol: v }); applyMusicVolume(); }}
      />
      <Slider
        label="Voice"
        value={s.voiceVol}
        onChange={async (v) => {
          await set({ voiceVol: v });
          // Preview: speak a short line at the new volume.
          say("rep");
          void playVoice;            // keep import live for tree-shaking diags
        }}
      />
      <Slider
        label="SFX"
        value={s.sfxVol}
        onChange={async (v) => {
          await set({ sfxVol: v });
          // Preview: rep beep + completion chime at the new volume.
          repBeep();
          setTimeout(() => setCompleteChime(), 150);
        }}
      />

      <Group label="Theme">
        {THEMES.map((t) => (
          <Pill key={t} selected={s.theme === t} onClick={() => set({ theme: t })}>
            {t[0].toUpperCase() + t.slice(1)}
          </Pill>
        ))}
      </Group>

      <Group label="Weight step">
        {WEIGHT_STEPS.map((w) => (
          <Pill key={w} selected={s.weightStep === w} onClick={() => set({ weightStep: w })}>
            {w} kg
          </Pill>
        ))}
      </Group>

      <Group label="Trainer character">
        <Pill selected={s.trainerEnabled}  onClick={() => set({ trainerEnabled: true })}>On</Pill>
        <Pill selected={!s.trainerEnabled} onClick={() => set({ trainerEnabled: false })}>Off</Pill>
      </Group>

      <Group label="Rest duration">
        {REST_STEPS.map((r) => (
          <Pill key={r} selected={s.restSeconds === r} onClick={() => set({ restSeconds: r })}>
            {r < 60 ? `${r}s` : `${Math.floor(r/60)}m${r%60 ? (r%60) : ""}`}
          </Pill>
        ))}
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="font-bold mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ selected, onClick, children }: {
  selected: boolean; onClick(): void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
        (selected ? "bg-accent text-on_accent" : "bg-panel-dark text-gray border border-border")
      }
    >
      {children}
    </button>
  );
}

function Slider({ label, value, onChange }:
  { label: string; value: number; onChange(v: number): void }) {
  return (
    <div className="mt-5">
      <div className="flex justify-between items-baseline">
        <div className="font-bold">{label}</div>
        <div className="text-sm text-gray-dark">{Math.round(value * 100)}%</div>
      </div>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
