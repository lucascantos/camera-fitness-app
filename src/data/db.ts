// Single IndexedDB wrapper for all persistent state.
// Each domain (settings, athlete, plans, calibration) keeps its own key.

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "camera-fitness-app";
const DB_VERSION = 1;
const STORE = "kv";

let _db: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      },
    });
  }
  return _db;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db()).get(STORE, key) as Promise<T | undefined>;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await (await db()).put(STORE, value, key);
}

/** Dump every key/value in the store — used for the settings "Export data" backup. */
export async function kvExportAll(): Promise<Record<string, unknown>> {
  const d = await db();
  const keys = await d.getAllKeys(STORE);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[String(k)] = await d.get(STORE, k);
  }
  return out;
}

/**
 * Restore a set of key/value pairs. With `clear`, wipes the store first so the
 * result is an exact replica of the backup (no stale keys left behind).
 */
export async function kvImportAll(
  entries: Record<string, unknown>,
  opts: { clear?: boolean } = {},
): Promise<void> {
  const d = await db();
  const tx = d.transaction(STORE, "readwrite");
  if (opts.clear) await tx.store.clear();
  for (const [k, v] of Object.entries(entries)) {
    await tx.store.put(v, k);
  }
  await tx.done;
}
