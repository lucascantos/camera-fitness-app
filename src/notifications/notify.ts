// Thin wrapper over the Web Notifications API. Everything here is best-effort:
// there's no server, so a notification can only be raised while the page is
// still alive (typically: the user switched to another app or tab).
//
// Notifications go through the service worker registration when there is one
// — Android Chrome refuses `new Notification()` outright — and fall back to
// the page-level constructor otherwise (dev server, where the SW is disabled).

export type NotifyPermission = NotificationPermission | "unsupported";

// lib.dom's NotificationOptions omits these, but Chromium honours them.
type ExtendedOptions = NotificationOptions & { renotify?: boolean; vibrate?: number[] };

const ICON = `${import.meta.env.BASE_URL}icons/icon-192.png`;

// Page-level notifications, so closeNotification() can reach them by tag.
const pageNotes = new Map<string, Notification>();

export function notificationPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Must be called from a user gesture, or browsers ignore / auto-deny it. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  const current = notificationPermission();
  if (current !== "default") return current;
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

async function swRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active ? reg : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Show a notification, replacing any earlier one with the same tag. Silently
 * does nothing without permission.
 */
export async function showNotification(
  title: string, { body, tag }: { body: string; tag: string },
): Promise<void> {
  if (notificationPermission() !== "granted") return;
  const opts: ExtendedOptions = {
    body, tag, icon: ICON, badge: ICON, renotify: true, vibrate: [200, 100, 200],
  };
  const reg = await swRegistration();
  try {
    if (reg) {
      await reg.showNotification(title, opts);
      return;
    }
    pageNotes.get(tag)?.close();
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); n.close(); };
    n.onclose = () => { if (pageNotes.get(tag) === n) pageNotes.delete(tag); };
    pageNotes.set(tag, n);
  } catch {
    // Unsupported constructor, inactive worker, etc. Nothing useful to do.
  }
}

export async function closeNotification(tag: string): Promise<void> {
  pageNotes.get(tag)?.close();
  pageNotes.delete(tag);
  const reg = await swRegistration();
  if (!reg) return;
  try {
    for (const n of await reg.getNotifications({ tag })) n.close();
  } catch {
    // ignore
  }
}
