// Standalone-install affordance. Chrome/Edge/Android surface an install button
// once the browser decides the app qualifies (manifest + service worker +
// HTTPS); iOS Safari has no such API, so it gets manual instructions instead.
// Renders nothing once already installed.

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallSection() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (installed) return null;
  if (!canInstall && !isIos) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="font-bold mb-1">Install app</div>
      {canInstall ? (
        <>
          <p className="text-sm text-gray-dark mb-3">
            Install Camera Fitness on this device for a full-screen, app-like
            experience — no browser address bar, and it launches from its own
            icon.
          </p>
          <button
            onClick={() => void promptInstall()}
            className="px-4 py-2 rounded-2xl text-sm font-semibold bg-accent text-on_accent hover:bg-accent-hov transition"
          >
            Install app
          </button>
        </>
      ) : (
        <p className="text-sm text-gray-dark">
          Add to your home screen: tap the Share icon in Safari, then
          “Add to Home Screen”.
        </p>
      )}
    </div>
  );
}
