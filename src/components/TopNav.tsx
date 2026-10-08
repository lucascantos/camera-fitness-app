// App header — wordmark on the left, settings on the right.
//
// The navigation tabs that used to live here moved to BottomNav: four pill
// tabs plus a wordmark and two icon buttons could not fit a 375px viewport,
// and bottom tabs are thumb-reachable during a workout.

import { useSessionStore } from "@/stores/sessionStore";
import { GearIcon } from "@/components/icons";

export function TopNav() {
  const { goTo } = useSessionStore();

  return (
    <header className="flex items-center justify-between px-4 pt-3 pb-2 bg-bg">
      <div className="flex items-center">
        <span className="text-lg font-extrabold tracking-tight text-accent">CAMERA</span>
        <span className="text-lg font-extrabold tracking-tight text-ink ml-1">FITNESS</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goTo("settings")}
          className="w-11 h-11 rounded-full bg-panel border border-border grid place-items-center text-ink hover:bg-panel-dark transition"
          title="Settings"
          aria-label="Settings"
        >
          <GearIcon size={18} />
        </button>
      </div>
    </header>
  );
}
