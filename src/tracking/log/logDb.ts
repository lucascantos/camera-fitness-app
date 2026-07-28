// Storage for tracking diagnostic logs.
//
// A separate IndexedDB database from src/data/db.ts on purpose. Traces are
// large (megabytes per set) and disposable, whereas the main "kv" store holds
// the user's real data and is dumped wholesale by kvExportAll for the backup
// feature. Keeping logs out of that database means they never bloat a backup,
// never survive an import, and can be wiped independently.

import { openDB, type IDBPDatabase } from "idb";
import type { SetLog, SetLogSummary } from "./types";

const DB_NAME = "camera-fitness-app-logs";
const DB_VERSION = 1;
const STORE = "sets";

// Oldest logs are pruned past this so a long debugging session can't fill the
// origin's quota and get the whole app's storage evicted.
const MAX_LOGS = 50;

let _db: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          const store = d.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("startedAt", "startedAt");
        }
      },
    });
  }
  return _db;
}

export async function putSetLog(log: SetLog): Promise<void> {
  const d = await db();
  await d.put(STORE, log);
  await prune(d);
}

export async function getSetLog(id: string): Promise<SetLog | undefined> {
  return (await db()).get(STORE, id) as Promise<SetLog | undefined>;
}

export async function getAllSetLogs(): Promise<SetLog[]> {
  const d = await db();
  const all = (await d.getAllFromIndex(STORE, "startedAt")) as SetLog[];
  return all.reverse(); // newest first
}

/** Summaries only — still reads each record, but drops the frame payload. */
export async function listSetLogs(): Promise<SetLogSummary[]> {
  const all = await getAllSetLogs();
  return all.map(summarise);
}

export async function deleteSetLog(id: string): Promise<void> {
  await (await db()).delete(STORE, id);
}

export async function clearSetLogs(): Promise<void> {
  await (await db()).clear(STORE);
}

/** Rough on-disk footprint of all logs, in bytes. */
export async function logStorageBytes(): Promise<number> {
  const all = await getAllSetLogs();
  return all.reduce((n, l) => n + approxBytes(l), 0);
}

function summarise(l: SetLog): SetLogSummary {
  return {
    id: l.id,
    startedAt: l.startedAt,
    exercise: l.context.exercise,
    countedReps: l.countedReps,
    actualReps: l.actualReps,
    frameCount: l.frames.length,
    durationMs: (l.endedAt ?? l.startedAt) - l.startedAt,
    bytes: approxBytes(l),
  };
}

// JSON length is a decent proxy and avoids a structured-clone round trip; it
// only feeds the "how much space am I using" readout.
function approxBytes(l: SetLog): number {
  try {
    return JSON.stringify(l).length;
  } catch {
    return 0;
  }
}

async function prune(d: IDBPDatabase): Promise<void> {
  const keys = await d.getAllKeysFromIndex(STORE, "startedAt");
  if (keys.length <= MAX_LOGS) return;
  const excess = keys.slice(0, keys.length - MAX_LOGS);
  const tx = d.transaction(STORE, "readwrite");
  for (const k of excess) await tx.store.delete(k);
  await tx.done;
}
