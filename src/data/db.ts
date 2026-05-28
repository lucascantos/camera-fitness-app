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
