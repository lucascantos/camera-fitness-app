import { useEffect, useState } from "react";
import { useDojoStore } from "@/stores/dojoStore";
import { computeCoins, isSessionComplete, CHARACTERS } from "@/data/dojo/dojo";
import { CheerBar } from "./CheerBar";

const CHAR_EMOJI: Record<string, string> = { cael: "🧝", bryn: "⛏️" };

export function TrainingView() {
  const { activeSession, collectRewards } = useDojoStore();
  const [coins, setCoins] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!activeSession) return;
    const tick = () => {
      setCoins(computeCoins(activeSession));
      setDone(isSessionComplete(activeSession));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  if (!activeSession) return null;

  const char = CHARACTERS[activeSession.characterId];

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-64 h-64 bg-panel border border-border rounded-3xl flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-3">{CHAR_EMOJI[activeSession.characterId]}</div>
            <div className="text-sm text-gray-dark animate-pulse">
              {char.name} is training…
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="bg-panel border border-border rounded-full px-5 py-2.5 flex items-center justify-between">
          <span className="font-semibold text-ink">Coins this session</span>
          <span className="font-extrabold text-coin">{done ? coins : "—"}</span>
        </div>
        <p className="text-xs text-center text-gray-dark mt-1.5">
          {done ? "Training complete — collect your reward!" : "Locked until complete"}
        </p>
      </div>

      <CheerBar disabled={done} />

      {done && (
        <div className="px-4 pb-8">
          <button
            onClick={() => void collectRewards()}
            className="w-full bg-accent text-on_accent font-bold py-3.5 rounded-2xl text-lg"
          >
            Collect +{coins} 🪙
          </button>
        </div>
      )}
    </div>
  );
}
