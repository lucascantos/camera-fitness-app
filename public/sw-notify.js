// Pulled into the Workbox-generated service worker via `importScripts` (see
// workbox.importScripts in vite.config.ts). Without a handler, tapping a
// notification does nothing on Android; with it, the tap brings the app back.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.length > 0) return windows[0].focus();
    return self.clients.openWindow(self.registration.scope);
  })());
});
