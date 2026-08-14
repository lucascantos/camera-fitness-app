import { useEffect, useState } from "react";
import { useDojoStore } from "@/stores/dojoStore";
import { getDojo, loadDojo, isSessionComplete } from "@/data/dojo/dojo";
import { useSessionStore } from "@/stores/sessionStore";
import { BackIcon } from "@/components/icons";
import { PowerBar } from "@/components/dojo/PowerBar";
import { CharacterSelect } from "@/components/dojo/CharacterSelect";
import { TrainingView } from "@/components/dojo/TrainingView";

export function Dojo() {
  const { goTo } = useSessionStore();
  const { power, activeSession, stopTraining, hydrate } = useDojoStore();
  const [confirmStop, setConfirmStop] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadDojo().then(hydrate);
  }, []);

  useEffect(() => {
    if (!activeSession) { setDone(false); return; }
    const tick = () => setDone(isSessionComplete(activeSession));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const dojo = getDojo();
  const charId = activeSession?.characterId;
  const level = charId ? dojo.progress[charId].level : 1;

  return (
    <div className="h-full flex flex-col bg-bg relative">

      {/* Top bar: back ← | power bar | stop ■ */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-1">
        <button
          onClick={() => goTo("home")}
          className="w-10 h-10 shrink-0 rounded-full bg-panel border border-border grid place-items-center text-ink mt-0.5"
          aria-label="Back"
        >
          <BackIcon size={18} />
        </button>

        <PowerBar power={power} activeSession={activeSession} level={level} />

        {activeSession && !done && (
          <button
            onClick={() => setConfirmStop(true)}
            className="w-10 h-10 shrink-0 bg-red-500 rounded-xl grid place-items-center text-white mt-0.5"
            aria-label="Stop training"
          >
            <span className="text-base leading-none">■</span>
          </button>
        )}
      </div>

      {/* Main content */}
      {activeSession ? <TrainingView /> : <CharacterSelect progress={dojo.progress} />}

      {/* Stop confirmation sheet */}
      {confirmStop && (
        <div className="absolute inset-0 bg-black/60 flex items-end z-10">
          <div className="w-full bg-panel rounded-t-3xl p-6 pb-10">
            <p className="font-bold text-lg text-center mb-1">Stop training?</p>
            <p className="text-sm text-gray-dark text-center mb-6">
              All progress this session will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStop(false)}
                className="flex-1 bg-panel-dark border border-border font-bold py-3 rounded-2xl text-ink"
              >
                Keep Going
              </button>
              <button
                onClick={() => { stopTraining(); setConfirmStop(false); }}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-2xl"
              >
                Forfeit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
