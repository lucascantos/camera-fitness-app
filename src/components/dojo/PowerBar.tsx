import { useEffect, useState } from "react";
import type { ActiveSession } from "@/data/dojo/types";
import { POWER_CAP, formatPower } from "@/data/dojo/dojo";

interface Props {
  power: number;
  activeSession: ActiveSession | null;
  level: number;
}

export function PowerBar({ power, activeSession, level }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeSession) { setRemaining(0); return; }
    const tick = () => {
      const r = activeSession.powerCommitted - (Date.now() - activeSession.startedAt) / 1000;
      setRemaining(Math.max(0, r));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const pct = activeSession
    ? (remaining / activeSession.powerCommitted) * 100
    : (power / POWER_CAP) * 100;

  const clampedPct = Math.max(0, Math.min(100, pct));

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold tracking-widest text-gray-dark uppercase">
          Power
        </span>
        <span className="text-xs text-gray-dark">{Math.round(clampedPct)}%</span>
      </div>
      <div className="h-1.5 bg-panel-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-1000"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-dark">
        {activeSession
          ? `${formatPower(remaining)} remaining · LV ${level} · ${activeSession.multiplier.toFixed(1)}×`
          : `${formatPower(power)} available`}
      </div>
    </div>
  );
}
