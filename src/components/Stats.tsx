// Stats shell — three sub-tabs ported from scenes/statistics.py.

import { useState } from "react";
import { Progress } from "./stats/Progress";
import { History }  from "./stats/History";
import { BodyMap }  from "./stats/BodyMap";
import { Body }     from "./stats/Body";

type StatsTab = "progress" | "history" | "bodymap" | "body";

const TABS: { id: StatsTab; label: string }[] = [
  { id: "progress", label: "Progress" },
  { id: "history",  label: "History"  },
  { id: "bodymap",  label: "Body Map" },
  { id: "body",     label: "Body"     },
];

export function Stats() {
  const [tab, setTab] = useState<StatsTab>("progress");

  return (
    <div>
      <div className="flex gap-6 px-8 pb-3 border-b border-border">
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "py-2 font-bold text-sm transition relative " +
                (on ? "text-ink" : "text-gray-dark hover:text-ink")
              }
            >
              {t.label}
              {on && (
                <span className="absolute left-0 right-0 -bottom-[13px] h-[2px] bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        {tab === "progress" && <Progress />}
        {tab === "history"  && <History  />}
        {tab === "bodymap"  && <BodyMap  />}
        {tab === "body"     && <Body     />}
      </div>
    </div>
  );
}
