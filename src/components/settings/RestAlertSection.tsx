// Opt-in toggle for the "rest over" notification. Turning it on is the user
// gesture that asks the browser for notification permission.

import { useState } from "react";
import { updateSettings } from "@/data/settings/settings";
import { notificationPermission, requestNotificationPermission } from "@/notifications/notify";
import { restAlertsEnabled } from "@/notifications/restAlert";
import { ToggleRow } from "./controls";

export function RestAlertSection() {
  const [on, setOn] = useState(restAlertsEnabled);
  const [perm, setPerm] = useState(notificationPermission);

  const toggle = async (next: boolean) => {
    if (next) {
      const p = await requestNotificationPermission();
      setPerm(p);
      if (p !== "granted") return;
    }
    await updateSettings({ restAlerts: next });
    setOn(next);
  };

  let hint = "Notifies you when rest ends if you’ve switched to another app or tab.";
  if (perm === "denied") {
    hint = "Notifications are blocked for this site. Allow them in your browser’s site settings, then turn this on.";
  } else if (perm === "unsupported") {
    hint = "This browser can’t show notifications. On iPhone, add the app to your Home Screen first.";
  }

  return (
    <div className="mt-6">
      {perm === "unsupported" ? (
        <div className="font-bold">Rest-timer alert</div>
      ) : (
        <ToggleRow label="Rest-timer alert" on={on} onToggle={(v) => void toggle(v)} />
      )}
      <p className="text-sm text-gray-dark mt-1">{hint}</p>
    </div>
  );
}
