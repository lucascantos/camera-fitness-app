import { useEffect } from "react";

// Screen Wake Lock: keeps the phone from dimming/sleeping while `active`.
// Essential on mobile — a workout has long stretches with no touch input, so
// without this the screen sleeps between reps and the camera feed stops.
//
// Android releases the lock automatically whenever the tab is hidden (screen
// off, app switched away), so we re-acquire on `visibilitychange` when we come
// back to the foreground and are still active.

// `wakeLock` isn't in older TS DOM lib versions; narrow it locally instead of
// pulling in a full type dependency.
interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
}
interface WakeLockNavigator {
  wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> };
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & WakeLockNavigator;
    if (!nav.wakeLock) return; // unsupported (older browsers) — no-op

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        sentinel = await nav.wakeLock!.request("screen");
      } catch {
        // Rejected (e.g. low battery, permission) — degrade silently.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
