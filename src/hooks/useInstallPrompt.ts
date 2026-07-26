import { useEffect, useState } from "react";

// Chrome/Edge/Android fire `beforeinstallprompt` when the page qualifies as
// installable (manifest + service worker + HTTPS). The browser's own install
// UI is suppressed until we call .prompt() on the captured event, which is
// what lets us show our own "Install app" button instead of relying on
// whatever the browser's default entry point happens to be.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for "launched from home screen".
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // suppress the browser's own mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // Chrome only fires beforeinstallprompt once per page load; whether
    // accepted or dismissed, this prompt is spent until the browser decides
    // to offer it again.
    setDeferred(null);
    return outcome;
  };

  return {
    /** True once the browser has told us the app is installable. */
    canInstall: !!deferred,
    /** True if already running as an installed/standalone app. */
    installed,
    promptInstall,
  };
}
