// Backup/restore of all persistent app data (settings, plans, athlete, body
// log, active session — everything in the IndexedDB kv store). Drives the
// Export/Import buttons in Settings. No server: a backup is just a JSON file
// the user downloads and can re-import later or on another device.

import { kvExportAll, kvImportAll } from "@/data/db";

const FORMAT = "camera-fitness-app/backup";
const VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Trigger a download of a full JSON backup of the user's data. */
export async function exportDataToFile(): Promise<void> {
  const backup: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data: await kvExportAll(),
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `camera-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse and restore a backup file's text, replacing all existing data. Throws
 * a user-facing Error if the file isn't a recognised backup. Callers should
 * reload the page afterwards so the in-memory store caches rehydrate.
 */
export async function importDataFromText(text: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const backup = parsed as Partial<BackupFile>;
  if (
    !backup ||
    backup.format !== FORMAT ||
    typeof backup.data !== "object" ||
    backup.data === null
  ) {
    throw new Error("This doesn't look like a Camera Fitness backup file.");
  }
  await kvImportAll(backup.data as Record<string, unknown>, { clear: true });
}
