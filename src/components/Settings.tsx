// Ported from: scenes/settings_overlay.py (legacy FitnessApp repo)
// Rendered as a full page here instead of an overlay. The self-contained
// sections live under ./settings/.

import { useState } from "react";
import { getSettings, updateSettings, type Theme } from "@/data/settings/settings";
import { applyMusicVolume } from "@/audio/music";
import { repBeep, setCompleteChime } from "@/audio/sfx";
import { say, setTrainer } from "@/data/trainers/say";
import { TRAINERS } from "@/data/trainers";
import { TrainerAvatar } from "@/components/trainer/TrainerAvatar";
import { POSE_STYLES } from "@/tracking/poseRenderer";
import { getGpuStatus } from "@/tracking/gpuStatus";
import { TrackingDebugSection } from "@/components/TrackingDebugSection";
import { Group, Pill, Slider, ToggleRow } from "./settings/controls";
import { InstallSection } from "./settings/InstallSection";
import { DataSection } from "./settings/DataSection";

const THEMES: { id: Theme; label: string }[] = [
  { id: "fitpop", label: "Light" },
  { id: "dark", label: "Dark" },
];
const WEIGHT_STEPS = [0.5, 1.0, 2.5, 5.0];
const REST_STEPS = [30, 60, 90, 120, 180];

export function Settings() {
  const [, force] = useState({});
  const s = getSettings();
  const gpu = getGpuStatus();
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
        // Preview: speak a short line at the new volume.
        onChange={async (v) => { await set({ voiceVol: v }); say("rep"); }}
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
          <Pill key={t.id} selected={s.theme === t.id} onClick={() => set({ theme: t.id })}>
            {t.label}
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

      {!gpu.hardwareAccelerated && (
        <div className="mt-6 rounded-2xl border border-coin bg-coin/10 p-4 flex gap-3">
          <div className="text-coin-dim text-xl leading-none shrink-0">⚠</div>
          <div className="text-sm">
            <div className="font-bold text-ink">Pose tracking is running on the CPU</div>
            <p className="text-gray-dark mt-1">
              {gpu.webglAvailable
                ? "Your browser is using a software renderer, so camera tracking will be slow and choppy."
                : "WebGL isn’t available, so the pose model can’t use the GPU and tracking will be slow."}
              {" "}Turn on <span className="font-semibold">“Use graphics acceleration when available”</span> in
              your browser settings and relaunch.
            </p>
            {gpu.renderer && (
              <p className="text-xs text-gray mt-1">Renderer: {gpu.renderer}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <ToggleRow
          label="Tracking display"
          on={s.poseStyle !== "off"}
          onToggle={(on) => set({ poseStyle: on ? "spring" : "off" })}
        />
        {s.poseStyle !== "off" && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {POSE_STYLES.filter((p) => p.id !== "off").map((p) => (
              <button
                key={p.id}
                onClick={() => set({ poseStyle: p.id })}
                className={
                  "rounded-2xl p-3 text-left transition border " +
                  (s.poseStyle === p.id
                    ? "bg-accent text-on_accent border-accent"
                    : "bg-panel-dark text-ink border-border hover:bg-bg")
                }
              >
                <div className="font-bold text-sm">{p.label}</div>
                <div className={"text-xs " + (s.poseStyle === p.id ? "opacity-80" : "text-gray-dark")}>
                  {p.hint}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ToggleRow
          label="Trainer"
          on={s.trainerEnabled}
          onToggle={(on) => set({ trainerEnabled: on })}
        />
        {s.trainerEnabled && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {TRAINERS.map((t) => (
              <button
                key={t.name}
                onClick={() => { setTrainer(t); say("greeting"); force({}); }}
                className="flex items-center gap-3 bg-panel border border-border rounded-2xl p-3 hover:bg-panel-dark transition text-left"
              >
                <TrainerAvatar trainer={t} size={56} />
                <div>
                  <div className="font-bold text-ink">{t.name}</div>
                  <div className="text-xs text-gray-dark">
                    {t.greetings[0] ?? ""}
                  </div>
                </div>
              </button>
            ))}
            {TRAINERS.length === 1 && (
              <div className="bg-panel-dark border border-dashed border-border rounded-2xl p-3 text-gray-dark text-sm grid place-items-center">
                More trainers coming soon
              </div>
            )}
          </div>
        )}
      </div>

      <Group label="Rest duration">
        {REST_STEPS.map((r) => (
          <Pill key={r} selected={s.restSeconds === r} onClick={() => set({ restSeconds: r })}>
            {r < 60 ? `${r}s` : `${Math.floor(r/60)}m${r%60 ? (r%60) : ""}`}
          </Pill>
        ))}
      </Group>

      <InstallSection />
      <DataSection />
      <TrackingDebugSection />
    </div>
  );
}
