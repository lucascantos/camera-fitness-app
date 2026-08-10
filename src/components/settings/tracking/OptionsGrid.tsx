// Which capture sources run while diagnostics are recording.

import type { DebugOptions } from "@/tracking/log/flag";
import { canCaptureVideo } from "@/tracking/log/videoCapture";
import { Check } from "./controls";

export function OptionsGrid({ opts, patch }: {
  opts: DebugOptions;
  patch(p: Partial<DebugOptions>): void;
}) {
  return (
    <>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Check
          label="Image quality"
          hint="Brightness, contrast and motion — catches bad lighting."
          on={opts.imageStats}
          onToggle={(v) => patch({ imageStats: v })}
        />
        <Check
          label="Device tilt"
          hint="Phone orientation. Asks permission on iOS."
          on={opts.orientation}
          onToggle={(v) => patch({ orientation: v })}
        />
        <Check
          label="Keyframes"
          hint="Stores small stills of you so a failed set can be watched back. Stays on this device."
          on={opts.keyframes}
          onToggle={(v) => patch({ keyframes: v })}
        />
        <Check
          label="All 33 landmarks"
          hint="Off logs only the joints the trackers read — smaller files."
          on={opts.fullLandmarks}
          onToggle={(v) => patch({ fullLandmarks: v })}
        />
        <Check
          label="Record video"
          hint={canCaptureVideo()
            ? "Records the camera so resolution/model changes can be re-tested against the same movement. ~11 MB/min, stays on this device."
            : "Not supported by this browser."}
          on={opts.video}
          onToggle={(v) => patch({ video: v })}
        />
        <Check
          label="Tap each rep"
          hint="Big tap target during the set. Says which reps were missed, not just how many."
          on={opts.repTap}
          onToggle={(v) => patch({ repTap: v })}
        />
      </div>

      {/* Interleaved A/B: between-session variance dominates, so comparing
          settings across sessions is swamped by it. Alternate within one. */}
      <div className="mt-3 rounded-2xl bg-panel-dark p-3">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">
          INFERENCE RESOLUTION
        </div>
        <div className="flex gap-2 mt-2">
          {[0, 320, 480, 640].map((d) => (
            <button
              key={d}
              onClick={() => patch({ inferenceDim: d })}
              className={
                "px-3 py-2 rounded-xl text-sm font-bold " +
                (opts.inferenceDim === d
                  ? "bg-accent text-on_accent"
                  : "bg-panel text-gray-dark border border-border")
              }
            >
              {d === 0 ? "default" : d}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
