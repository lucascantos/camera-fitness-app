// Training reminders, run inside the service worker (pulled in via
// workbox.importScripts in vite.config.ts). Chrome fires "periodicsync" now
// and then for the installed app (src/notifications/trainingReminder.ts
// registers it); each time, we read the app's own IndexedDB and notify only
// when a nudge makes sense:
//   - reminders are on, it's daytime (08:00–21:00), no workout today yet,
//   - the week's goal isn't met,
//   - and either it's been a while since the last workout (2+ days at 3 a
//     week or less, 1+ day at 4–5) or there are no more days to spare;
//   - at most once a day.
// `cfReminder.decide` is pure so it can be tested outside the worker.

(function () {
  const DB_NAME = "camera-fitness-app";
  const STORE = "kv";
  const TAG = "training-reminder";

  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const mondayIndex = (d) => (d.getDay() + 6) % 7;
  const dayMs = 86400000;
  const atMidnight = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };

  /** What to say, or null for no reminder. Pure: state in, decision out. */
  function decide({ settings, athlete, plans, lastReminder }, now) {
    if (!settings || !settings.trainingReminders || !settings.onboarded) return null;
    const hour = now.getHours();
    if (hour < 8 || hour >= 21) return null;
    const today = iso(now);
    if (lastReminder === today) return null;

    const dates = new Set(((athlete && athlete.history) || []).map((e) => e.date));
    if (dates.has(today)) return null;

    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayIndex(now));
    const done = [...dates].filter((d) => atMidnight(d) >= monday.getTime()).length;
    const goal = settings.weeklyGoal || 3;
    const needed = goal - done;
    if (needed <= 0) return null;

    const daysLeft = 7 - mondayIndex(now);                     // including today
    const last = [...dates].sort().pop();
    const sinceLast = last ? Math.round((atMidnight(today) - atMidnight(last)) / dayMs) : Infinity;
    const gap = goal >= 4 ? 1 : 2;
    if (sinceLast < gap && needed < daysLeft) return null;

    const plan = (plans || []).find((p) => p.id === settings.activePlanId);
    let next = "";
    if (plan && plan.workouts.length) {
      const cursor = ((athlete && athlete.progress && athlete.progress[plan.id]) || {})._day_cursor || 0;
      const name = plan.workouts[cursor % plan.workouts.length].name;
      next = ` Next up: ${name.length === 1 ? `Day ${name}` : name}.`;
    }
    const tight = needed >= daysLeft;
    return {
      title: tight ? "Today's the day" : "Time to train",
      body: `${done} of ${goal} this week${tight ? ` — ${needed} to go, ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}.${next}`,
      today,
    };
  }

  function readState() {
    return new Promise((resolve) => {
      const open = indexedDB.open(DB_NAME);
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve(null); return; }
        const store = db.transaction(STORE).objectStore(STORE);
        const keys = ["settings", "athlete", "plans", "trainingReminderLast"];
        const out = {};
        let left = keys.length;
        keys.forEach((k) => {
          const r = store.get(k);
          r.onsuccess = () => { out[k] = r.result; if (--left === 0) { db.close(); resolve(out); } };
          r.onerror = () => { if (--left === 0) { db.close(); resolve(out); } };
        });
      };
    });
  }

  function markSent(today) {
    const open = indexedDB.open(DB_NAME);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(today, "trainingReminderLast");
      tx.oncomplete = () => db.close();
    };
  }

  async function check() {
    const state = await readState();
    if (!state) return;
    const d = decide({ ...state, lastReminder: state.trainingReminderLast }, new Date());
    if (!d) return;
    const icon = `${self.registration.scope}icons/icon-192.png`;
    await self.registration.showNotification(d.title, { body: d.body, tag: TAG, icon, badge: icon });
    markSent(d.today);
  }

  self.cfReminder = { decide };
  self.addEventListener("periodicsync", (event) => {
    if (event.tag === TAG) event.waitUntil(check());
  });
})();
