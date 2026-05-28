// Minimal stats view. Body Map / 1RM charts are deferred to a later pass.

import { getAthlete } from "@/data/athlete/athlete";

export function Stats() {
  const a = getAthlete();
  const totalReps = a.history.reduce(
    (s, e) => s + e.exercises.reduce((x, ex) =>
      x + ex.sets.reduce((y, st) => y + st.reps, 0), 0), 0);
  const totalSessions = a.history.length;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold mb-6">Statistics</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Tile label="SESSIONS" value={String(totalSessions)} />
        <Tile label="TOTAL REPS" value={String(totalReps)} />
        <Tile label="COINS" value={String(a.coins)} />
      </div>

      <h2 className="text-xl font-bold mb-3">History</h2>
      <div className="bg-panel rounded-2xl border border-border divide-y divide-border">
        {a.history.length === 0 && (
          <div className="p-5 text-gray-dark">No sessions yet — finish your first workout.</div>
        )}
        {[...a.history].reverse().slice(0, 30).map((e, i) => (
          <div key={i} className="p-4 flex items-baseline justify-between">
            <div>
              <div className="font-bold">{e.exercises.map((x) => titleCase(x.exercise)).join(" · ")}</div>
              <div className="text-sm text-gray-dark">{e.date}</div>
            </div>
            <div className="text-coin font-bold">+{e.coinsEarned}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel rounded-2xl p-5 border border-border">
      <div className="text-xs font-bold tracking-widest text-gray-dark">{label}</div>
      <div className="text-4xl font-extrabold mt-2">{value}</div>
    </div>
  );
}

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }
