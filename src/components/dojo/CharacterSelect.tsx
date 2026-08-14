import { CHARACTERS } from "@/data/dojo/dojo";
import { useDojoStore } from "@/stores/dojoStore";
import type { CharacterId, DojoState } from "@/data/dojo/types";

const CHAR_EMOJI: Record<CharacterId, string> = { cael: "🧝", bryn: "⛏️" };

interface Props {
  progress: DojoState["progress"];
}

export function CharacterSelect({ progress }: Props) {
  const { sendToTrain, power } = useDojoStore();
  const noPower = power <= 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-sm text-gray-dark text-center max-w-xs">
        {noPower
          ? "Complete a workout to charge Power, then send a student to train."
          : "Choose a student to send for training."}
      </p>

      <div className="flex gap-4 w-full max-w-xs">
        {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
          const char = CHARACTERS[id];
          const prog = progress[id];
          return (
            <button
              key={id}
              onClick={() => sendToTrain(id)}
              disabled={noPower}
              className="flex-1 bg-panel border border-border rounded-2xl p-5 text-center
                         active:scale-95 transition-transform disabled:opacity-40"
            >
              <div className="text-5xl mb-3">{CHAR_EMOJI[id]}</div>
              <div className="font-bold text-ink text-lg">{char.name}</div>
              <div className="text-xs text-gray-dark mt-1">
                {char.species} · LV {prog.level}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
