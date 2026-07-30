// Settings panel for the tracking diagnostics log (dev-only feature).
//
// This is the control surface for the whole src/tracking/log/ subsystem: turn
// recording on, choose which capture sources run, and get the traces off the
// device. That last part is the awkward one — the traces are recorded on a
// phone and need to be read on a laptop, with no cloud storage in between. See
// src/tracking/log/export.ts for the three routes and when each applies.

import { useEffect, useState } from "react";
import {
  getDebugOptions,
  setDebugOptions,
  type DebugOptions,
} from "@/tracking/log/flag";
import { exportAllLogs, hasDevSink } from "@/tracking/log/export";
import { clearSetLogs, listSetLogs, listSetVideos } from "@/tracking/log/logDb";
import { canCaptureVideo } from "@/tracking/log/videoCapture";
import type { SetLogSummary } from "@/tracking/log/types";

export function TrackingDebugSection() {
  const [opts, setOpts] = useState<DebugOptions>(getDebugOptions);
  const [logs, setLogs] = useState<SetLogSummary[]>([]);
  const [sink, setSink] = useState<boolean | null>(null);
  const [videoBytes, setVideoBytes] = useState(0);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = () => {
    void listSetLogs().then(setLogs).catch(() => setLogs([]));
    void listSetVideos().then((v) => setVideoBytes(v.bytes)).catch(() => setVideoBytes(0));
  };

  useEffect(() => {
    refresh();
    void hasDevSink().then(setSink);
  }, []);

  const patch = (p: Partial<DebugOptions>) => setOpts(setDebugOptions(p));

  async function onExport() {
    setStatus(null);
    try {
      const r = await exportAllLogs();
      setStatus({
        kind: "ok",
        msg:
          r.route === "dev-sink"
            ? `Sent ${r.count} trace(s)${r.videos ? ` + ${r.videos} recording(s)` : ""} to your dev machine → logs/`
            : r.route === "share"
              ? `Shared ${r.count} trace(s)`
              : `Downloaded ${r.count} trace(s)`,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // user cancelled
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function onClear() {
    // Only traces to clear: there is no persisted calibration any more. The
    // tracker re-measures the athlete's range from scratch on every set, so a
    // fresh set is already a fresh start.
    await clearSetLogs();
    refresh();
    setStatus({ kind: "ok", msg: "Cleared all traces" });
  }

  const totalBytes = logs.reduce((n, l) => n + l.bytes, 0);

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold mb-1">Tracking diagnostics</div>
          <p className="text-sm text-gray-dark max-w-prose">
            Records the pose data and rep-counter state for every set, so a
            miscount can be diagnosed instead of guessed at. Off by default —
            it adds per-frame work and stores several MB per set.
          </p>
        </div>
        <Switch on={opts.enabled} onToggle={(on) => patch({ enabled: on })} />
      </div>

      {opts.enabled && (
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

          <div className="mt-4 rounded-2xl bg-panel-dark p-3">
            <div className="text-sm font-bold text-ink">
              {logs.length} trace{logs.length === 1 ? "" : "s"} stored
              {totalBytes > 0 && (
                <span className="font-normal text-gray-dark"> · {mb(totalBytes)}</span>
              )}
              {videoBytes > 0 && (
                <span className="font-normal text-gray-dark"> + {mb(videoBytes)} video</span>
              )}
            </div>
            <div className="text-xs text-gray-dark mt-1">
              {sink === true
                ? "Dev server detected — Export writes straight to logs/ on that machine."
                : sink === false
                  ? "No dev server on this origin — Export uses the share sheet or a download."
                  : "Checking for a dev server…"}
            </div>

            {logs.length > 0 && (
              <ul className="mt-3 max-h-48 overflow-y-auto text-xs font-mono text-gray-dark">
                {logs.map((l) => (
                  <li key={l.id} className="flex gap-2 py-0.5">
                    <span className="shrink-0">{time(l.startedAt)}</span>
                    <span className="flex-1 truncate">{l.exercise}</span>
                    {/* The whole point of the label: counted vs actual. */}
                    <span
                      className={
                        l.actualReps != null && l.actualReps !== l.countedReps
                          ? "text-accent font-bold shrink-0"
                          : "shrink-0"
                      }
                    >
                      {l.countedReps ?? "–"}
                      {l.actualReps != null && `/${l.actualReps}`}
                    </span>
                    <span className="shrink-0 w-14 text-right">{l.frameCount}f</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => void onExport()}
              disabled={logs.length === 0}
              className="px-4 py-2 rounded-2xl text-sm font-semibold bg-accent text-on_accent hover:bg-accent-hov transition disabled:opacity-40"
            >
              Export traces
            </button>
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-2xl text-sm font-semibold bg-panel-dark text-ink border border-border hover:bg-bg transition"
            >
              Refresh
            </button>
            <button
              onClick={() => void onClear()}
              disabled={logs.length === 0}
              className="px-4 py-2 rounded-2xl text-sm font-semibold text-accent border border-border hover:bg-bg transition disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {status && (
            <div className={"text-sm mt-3 " + (status.kind === "ok" ? "text-good" : "text-accent")}>
              {status.msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Check({ label, hint, on, onToggle }: {
  label: string; hint: string; on: boolean; onToggle(v: boolean): void;
}) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={
        "text-left rounded-2xl p-3 border transition " +
        (on ? "bg-accent/10 border-accent" : "bg-panel-dark border-border")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "w-4 h-4 rounded grid place-items-center text-[10px] shrink-0 " +
            (on ? "bg-accent text-on_accent" : "bg-panel border border-border")
          }
        >
          {on ? "✓" : ""}
        </span>
        <span className="font-bold text-sm text-ink">{label}</span>
      </div>
      <div className="text-xs text-gray-dark mt-1">{hint}</div>
    </button>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle(v: boolean): void }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      role="switch"
      aria-checked={on}
      aria-label="Tracking diagnostics"
      className={
        "w-14 h-8 rounded-full p-1 shrink-0 transition-colors " +
        (on ? "bg-accent" : "bg-panel-dark border border-border")
      }
    >
      <span
        className={
          "block w-6 h-6 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-6" : "translate-x-0")
        }
      />
    </button>
  );
}

function mb(bytes: number): string {
  return bytes < 1e6 ? `${Math.round(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1)} MB`;
}

function time(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
