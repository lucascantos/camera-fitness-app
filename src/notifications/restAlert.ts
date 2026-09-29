// "Rest over" alert: if the user has left the app mid-rest, tell them when the
// timer runs out instead of letting it end unseen. Opt-in via Settings.

import { getSettings } from "@/data/settings/settings";
import { useSessionStore } from "@/stores/sessionStore";
import { titleCase } from "@/lib/format";
import { closeNotification, notificationPermission, showNotification } from "./notify";

const TAG = "rest-timer";

export function restAlertsEnabled(): boolean {
  return getSettings().restAlerts && notificationPermission() === "granted";
}

/** Call as rest ends, after the cursor has moved to the upcoming set. */
export function notifyRestOver(): void {
  if (!document.hidden || !restAlertsEnabled()) return;

  const { session, workoutIdx, setIdx } = useSessionStore.getState();
  const w = session?.workouts[workoutIdx];
  const body = w
    ? `${titleCase(w.exercise)} · set ${setIdx + 1} of ${w.sets.length}`
    : "Time for your next set.";
  void showNotification("Rest over", { body, tag: TAG });

  // Once they're back in the app the notification has done its job.
  const onVisible = () => {
    if (document.hidden) return;
    document.removeEventListener("visibilitychange", onVisible);
    void closeNotification(TAG);
  };
  document.addEventListener("visibilitychange", onVisible);
}
