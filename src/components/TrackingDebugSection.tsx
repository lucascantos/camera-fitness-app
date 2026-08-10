// Settings panel for the tracking diagnostics log (dev-only feature).
//
// This is the control surface for the whole src/tracking/log/ subsystem: turn
// recording on, choose which capture sources run, and get the traces off the
// device. That last part is the awkward one — the traces are recorded on a
// phone and need to be read on a laptop, with no cloud storage in between. See
// src/tracking/log/export.ts for the three routes and when each applies.

import { useEffect, useState } from "react";
import { getDebugOptions, setDebugOptions, type DebugOptions } from "@/tracking/log/flag";
import { exportAllLogs, hasDevSink } from "@/tracking/log/export";
import { clearSetLogs, listSetLogs, listSetVideos } from "@/tracking/log/logDb";
import type { SetLogSummary } from "@/tracking/log/types";
import { OptionsGrid } from "./settings/tracking/OptionsGrid";
import { mb, Switch, time } from "./settings/tracking/controls";

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
          <OptionsGrid opts={opts} patch={patch} />

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
