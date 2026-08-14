import { useDojoStore } from "@/stores/dojoStore";

const CHEERS = [
  { emoji: "🔥", label: "Fire"   },
  { emoji: "💪", label: "Muscle" },
  { emoji: "🎉", label: "Party"  },
  { emoji: "👏", label: "Clap"   },
] as const;

export function CheerBar({ disabled }: { disabled: boolean }) {
  const cheer = useDojoStore((s) => s.cheer);

  return (
    <div className="flex justify-around px-4 py-2">
      {CHEERS.map(({ emoji, label }) => (
        <button
          key={label}
          onClick={cheer}
          disabled={disabled}
          aria-label={label}
          className="w-14 h-14 text-2xl rounded-full bg-panel border border-border
                     active:scale-90 transition-transform disabled:opacity-30"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
