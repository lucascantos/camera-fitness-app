// Training reminders without a server: Periodic Background Sync. Chrome on
// Android wakes the installed app's service worker now and then (it decides
// when — at most about daily, less for rarely used apps), and the worker
// decides whether to notify (public/sw-notify.js, "periodicsync"). So this
// module only registers or unregisters that wake-up to match the setting and
// the notification permission. Elsewhere (iPhone, desktop, a plain browser
// tab) the API doesn't exist and reminders are simply unavailable.

import { getSettings } from "@/data/settings/settings";
import { notificationPermission } from "./notify";

const TAG = "training-reminder";
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export type ReminderStatus = "on" | "off" | "unavailable";

// Not in lib.dom yet.
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
}
type RegistrationWithSync = ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager };

async function registration(): Promise<RegistrationWithSync | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    return (await navigator.serviceWorker.getRegistration()) as RegistrationWithSync | undefined;
  } catch {
    return undefined;
  }
}

/** Can this device do background reminders at all? */
export async function remindersAvailable(): Promise<boolean> {
  const reg = await registration();
  if (!reg?.periodicSync) return false;
  try {
    const st = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    return st.state === "granted";   // granted for installed apps; denied in a tab
  } catch {
    return false;
  }
}

/**
 * Bring the background wake-up in line with the setting: register it when
 * reminders are on and notifications are allowed, remove it otherwise. Call
 * on start-up and whenever the setting changes.
 */
export async function syncTrainingReminder(): Promise<ReminderStatus> {
  const reg = await registration();
  if (!reg?.periodicSync || !(await remindersAvailable())) return "unavailable";
  const want = getSettings().trainingReminders && notificationPermission() === "granted";
  try {
    if (want) await reg.periodicSync.register(TAG, { minInterval: MIN_INTERVAL_MS });
    else await reg.periodicSync.unregister(TAG);
    return want ? "on" : "off";
  } catch {
    return "unavailable";
  }
}
