// Lightweight in-workout settings modal. Opened from the gear on the Training
// screen so the user can tweak the essentials without leaving the session.
// Dismiss via the ✕ or by clicking the backdrop (same pattern as
// SessionRecovery). Full settings still live on the Settings page.

import { useState } from "react";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { applyMusicVolume } from "@/audio/music";
import { POSE_STYLES } from "@/tracking/poseRenderer";
import { TRAINERS } from "@/data/trainers";
import { setTrainer, say, currentTrainer } from "@/data/trainers/say";
import { TrainerAvatar } from "@/components/trainer/TrainerAvatar";

const WEIGHT_STEPS = [0.5, 1.0, 2.5, 5.0];

export function QuickSettings({ onClose }: { onClose(): void }) {
  const [, force] = useState({});
  const s = getSettings();
  const active = currentTrainer();
  const set = async (patch: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(patch);
    force({});
  };

  return (
    // Backdrop — clicking it closes.
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50"
    >
      {/* Dialog — stopPropagation so inner clicks don't bubble to backdrop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-panel rounded-3xl shadow-card border border-border p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto"
      >
        {/* Close ✕ */}
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full grid place-items-center text-gray-dark hover:text-ink hover:bg-panel-dark transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2"  x2="12" y2="12" />
            <line x1="12" y1="2" x2="2"  y2="12" />
          </svg>
        </button>

        <h2 className="text-xl font-extrabold text-ink pr-8 mb-4">Settings</h2>

        {/* Master volume */}
        <Section title="Master volume">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.masterVol}
              onChange={async (e) => {
                await set({ masterVol: Number(e.target.value) });
                applyMusicVolume();
              }}
              className="flex-1 accent-accent"
            />
            <span className="w-10 text-right text-sm font-semibold text-ink tabular-nums">
              {Math.round(s.masterVol * 100)}%
            </span>
          </div>
        </Section>

        {/* Tracking display */}
        <Section title="Tracking display">
          <div className="grid grid-cols-3 gap-2">
            {POSE_STYLES.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ poseStyle: p.id })}
                className={
                  "rounded-xl px-2 py-2 text-sm font-semibold transition border " +
                  (s.poseStyle === p.id
                    ? "bg-accent text-on_accent border-accent"
                    : "bg-panel-dark text-ink border-border hover:bg-bg")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Trainer */}
        <Section title="Trainer">
          <div className="flex gap-2">
            <Pill selected={s.trainerEnabled} onClick={() => set({ trainerEnabled: true })}>On</Pill>
            <Pill selected={!s.trainerEnabled} onClick={() => set({ trainerEnabled: false })}>Off</Pill>
          </div>
          {s.trainerEnabled && TRAINERS.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {TRAINERS.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setTrainer(t); say("greeting"); force({}); }}
                  className={
                    "rounded-2xl p-1 border transition " +
                    (active.name === t.name
                      ? "border-accent ring-2 ring-accent"
                      : "border-border hover:bg-panel-dark")
                  }
                  title={t.name}
                >
                  <TrainerAvatar trainer={t} size={40} />
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Weight step */}
        <Section title="Weight step">
          <div className="flex flex-wrap gap-2">
            {WEIGHT_STEPS.map((w) => (
              <Pill key={w} selected={s.weightStep === w} onClick={() => set({ weightStep: w })}>
                {w} kg
              </Pill>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="font-bold text-ink mb-2">{title}</div>
      {children}
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
