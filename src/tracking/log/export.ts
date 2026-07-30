// Getting traces off the device they were recorded on.
//
// The traces that matter are recorded on a phone; they get read on a laptop;
// there is no cloud storage in this project to move them through. Three routes,
// tried in this order:
//
//   1. Dev sink — when the phone is running the app off `npm run dev:mobile`,
//      the laptop's Vite dev server is already the origin, so we POST straight
//      to it and the file lands in ./logs/ on the laptop. One tap, no fiddling.
//      See scripts/viteLogSink.ts.
//   2. Share sheet — navigator.share with a file attachment. Works on Android
//      Chrome and iOS Safari, and covers testing the deployed build where no
//      dev server exists. The user picks Drive/mail/AirDrop themselves.
//   3. Download — a plain object-URL download, the universal fallback.
//
// Nothing is ever sent anywhere the user didn't pick: route 1 is the user's own
// laptop on the LAN, routes 2 and 3 are OS-level handoffs.

import { getAllSetLogs, getSetLog, getSetVideo } from "./logDb";
import type { SetLog } from "./types";

const SINK_ROUTE = "/__tracking-log";

export type ExportRoute = "dev-sink" | "share" | "download";

export interface ExportResult {
  route: ExportRoute;
  count: number;
  /** Paths written on the dev machine, when the sink handled it. */
  files?: string[];
  /** Recordings uploaded alongside the traces. */
  videos?: number;
}

let sinkAvailable: boolean | null = null;

/**
 * Probe for the dev sink once per page load. Cheap GET; a production build
 * (GitHub Pages) 404s or returns HTML, both of which read as unavailable.
 */
export async function hasDevSink(): Promise<boolean> {
  if (sinkAvailable !== null) return sinkAvailable;
  try {
    const res = await fetch(SINK_ROUTE, { method: "GET" });
    const ct = res.headers.get("content-type") ?? "";
    sinkAvailable = res.ok && ct.includes("application/json");
  } catch {
    sinkAvailable = false;
  }
  return sinkAvailable;
}

/** Export every stored trace by the best route available. */
export async function exportAllLogs(): Promise<ExportResult> {
  const logs = await getAllSetLogs();
  return exportLogs(logs, `tracking-logs-${stamp()}.json`);
}

/** Export a single trace by id. */
export async function exportLog(id: string): Promise<ExportResult> {
  const log = await getSetLog(id);
  if (!log) throw new Error("No such log");
  const ex = log.context.exercise.replace(/[^a-z0-9]+/gi, "-");
  return exportLogs([log], `tracking-log-${ex}-${stamp(log.startedAt)}.json`);
}

async function exportLogs(logs: SetLog[], filename: string): Promise<ExportResult> {
  if (logs.length === 0) throw new Error("Nothing recorded yet");
  const payload = JSON.stringify(logs);

  if (await hasDevSink()) {
    try {
      const res = await fetch(SINK_ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      const body = (await res.json()) as { ok: boolean; files?: string[]; error?: string };
      if (res.ok && body.ok) {
        // Recordings go separately as raw binary — they are far too large to
        // base64 into the JSON payload.
        const videos = await uploadVideos(logs.map((l) => l.id));
        return { route: "dev-sink", count: logs.length, files: body.files, videos };
      }
      // Fall through to the share/download routes rather than failing —
      // losing the trace to a sink hiccup would be the worst outcome.
      console.warn("[tracking-log] dev sink rejected upload:", body.error);
    } catch (e) {
      console.warn("[tracking-log] dev sink unreachable:", e);
    }
  }

  const file = new File([payload], filename, { type: "application/json" });

  // canShare({ files }) is the only reliable capability check — plenty of
  // browsers define navigator.share but refuse file payloads.
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: filename });
      return { route: "share", count: logs.length };
    } catch (e) {
      // AbortError = the user dismissed the sheet; don't then silently dump a
      // download on them, that's not what they asked for.
      if (e instanceof DOMException && e.name === "AbortError") {
        throw e;
      }
      console.warn("[tracking-log] share failed, falling back to download:", e);
    }
  }

  download(file, filename);
  return { route: "download", count: logs.length };
}

/**
 * POST each stored recording to the dev sink. Best-effort: a failure here must
 * not lose the trace that already uploaded successfully.
 */
async function uploadVideos(ids: string[]): Promise<number> {
  let sent = 0;
  for (const id of ids) {
    let blob: Blob | undefined;
    try {
      blob = await getSetVideo(id);
    } catch { continue; }
    if (!blob) continue;
    try {
      const res = await fetch(`${SINK_ROUTE}/video?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": blob.type || "application/octet-stream" },
        body: blob,
      });
      if (res.ok) sent++;
    } catch (e) {
      console.warn("[tracking-log] video upload failed for", id, e);
    }
  }
  return sent;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — revoking synchronously can cancel the download
  // on some mobile browsers before it's started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function stamp(ms = Date.now()): string {
  return new Date(ms).toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
