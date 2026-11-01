// Opt-in training reminders (see src/notifications/trainingReminder.ts).
// Turning it on is the user gesture that asks for notification permission.
// Only the installed app on Android (Chrome) can be woken in the background,
// so elsewhere the toggle explains that instead.

import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/data/settings/settings";
import { notificationPermission, requestNotificationPermission } from "@/notifications/notify";
import { remindersAvailable, syncTrainingReminder } from "@/notifications/trainingReminder";
import { ToggleRow } from "./controls";

export function TrainingReminderSection() {
  const [on, setOn] = useState(() => getSettings().trainingReminders);
  const [perm, setPerm] = useState(notificationPermission);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => { void remindersAvailable().then(setAvailable); }, []);

  const toggle = async (next: boolean) => {
    if (next) {
      const p = await requestNotificationPermission();
      setPerm(p);
      if (p !== "granted") return;
    }
    await updateSettings({ trainingReminders: next });
    setOn(next);
    await syncTrainingReminder();
  };

  const goal = getSettings().weeklyGoal;
  let hint = `A nudge on days you haven't trained yet, when you're behind on ${goal} workouts a week. Your phone decides the exact time, about once a day.`;
  if (perm === "denied") {
    hint = "Notifications are blocked for this site. Allow them in your browser’s site settings, then turn this on.";
  } else if (available === false) {
    hint = "Reminders need the installed app on Android (Chrome). Install it from the browser menu, then turn this on.";
  }

  return (
    <div className="mt-6">
      {perm === "unsupported" ? (
        <div className="font-bold">Training reminders</div>
      ) : (
        <ToggleRow label="Training reminders" on={on} onToggle={(v) => void toggle(v)} />
      )}
      <p className="text-sm text-gray-dark mt-1">{hint}</p>
    </div>
  );
}
