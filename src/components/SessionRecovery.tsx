// Popup shown on app load when a persisted workout session exists.
// Two primary actions side-by-side: End session · Continue.
// Dismiss via the ✕ in the corner or by clicking the backdrop.

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
    // Backdrop — clicking it dismisses.
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50"
    >
      {/* Dialog — stopPropagation so inner clicks don't bubble to backdrop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-panel rounded-3xl shadow-card border border-border p-8 max-w-md w-full mx-4"
      >
        {/* Close ✕ in the corner */}
        <button
          onClick={onDismiss}
          aria-label="Close"
          title="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full grid place-items-center text-gray-dark hover:text-ink hover:bg-panel-dark transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2"  x2="12" y2="12" />
            <line x1="12" y1="2" x2="2"  y2="12" />
          </svg>
        </button>

        <div className="text-[11px] font-bold tracking-widest text-good mb-2">
          WORKOUT IN PROGRESS
        </div>
        <h2 className="text-2xl font-extrabold text-ink pr-8">
          {titleCase(exercise)}
        </h2>
        <p className="text-gray-dark mt-1">
          {exLabel} · {setLabel}
        </p>
        <p className="text-sm text-gray-dark mt-3">
          You have an unfinished workout. Would you like to continue?
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => { endSession(); onDismiss(); }}
            className="w-full bg-panel-dark text-ink font-bold py-3 rounded-2xl text-base hover:bg-border transition"
          >
            End session
          </button>
          <button
            onClick={() => { goTo("training"); onDismiss(); }}
            className="w-full bg-accent text-white font-bold py-3 rounded-2xl text-base flex items-center justify-center gap-2 hover:bg-accent-hov transition"
          >
            <PlayIcon size={12} color="#FFFFFF" />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
