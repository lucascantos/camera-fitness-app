// Popup shown on app load when a persisted workout session exists.
// Options: Continue, End session, or dismiss (close).

import { useSessionStore } from "@/stores/sessionStore";
import { PlayIcon } from "@/components/icons";

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SessionRecovery({ onDismiss }: { onDismiss(): void }) {
  const { session, workoutIdx, setIdx, goTo, endSession } = useSessionStore();
  if (!session) return null;

  const workout = session.workouts[workoutIdx];
  const exercise = workout?.exercise ?? "Workout";
  const setLabel = `Set ${setIdx + 1} of ${workout?.sets.length ?? 0}`;
  const exLabel = `Exercise ${workoutIdx + 1} of ${session.workouts.length}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50">
      <div className="bg-panel rounded-3xl shadow-card border border-border p-8 max-w-md w-full mx-4">
        <div className="text-[11px] font-bold tracking-widest text-good mb-2">
          WORKOUT IN PROGRESS
        </div>
        <h2 className="text-2xl font-extrabold text-ink">
          {titleCase(exercise)}
        </h2>
        <p className="text-gray-dark mt-1">
          {exLabel} · {setLabel}
        </p>
        <p className="text-sm text-gray-dark mt-3">
          You have an unfinished workout. Would you like to continue?
        </p>

        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={() => { goTo("training"); onDismiss(); }}
            className="w-full bg-accent text-white font-bold py-3 rounded-2xl text-base flex items-center justify-center gap-2 hover:bg-accent-hov transition"
          >
            <PlayIcon size={12} color="#FFFFFF" />
            Continue workout
          </button>
          <button
            onClick={() => { endSession(); onDismiss(); }}
            className="w-full bg-panel-dark text-ink font-bold py-3 rounded-2xl text-base hover:bg-border transition"
          >
            End session
          </button>
          <button
            onClick={onDismiss}
            className="w-full text-gray-dark font-bold py-2 text-sm hover:text-ink transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
