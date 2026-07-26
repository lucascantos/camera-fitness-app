// Bottom tab bar — the app's primary navigation on phones.
//
// Replaces the old top pill-tab group, which couldn't fit four tabs plus a
// wordmark and profile controls on a 375px screen. Thumb-reachable, and the
// pattern users expect from a native app.
//
// Pinned to the bottom with safe-area padding so it clears the Android
// gesture bar / iOS home indicator. App.tsx reserves matching space so
// content never hides behind it.

import { useSessionStore, type SceneName } from "@/stores/sessionStore";
import {
  HomeIcon,
  PlansIcon,
  ExercisesIcon,
  StatsIcon,
} from "@/components/icons";

const TABS: { name: SceneName; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { name: "home",      label: "Home",      Icon: HomeIcon      },
  { name: "plans",     label: "Plans",     Icon: PlansIcon     },
  { name: "exercises", label: "Exercises", Icon: ExercisesIcon },
  { name: "stats",     label: "Stats",     Icon: StatsIcon     },
];

export function BottomNav() {
  const { scene, goTo } = useSessionStore();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-panel border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {TABS.map(({ name, label, Icon }) => {
          const active = scene === name;
          return (
            <button
              key={name}
              onClick={() => goTo(name)}
              aria-current={active ? "page" : undefined}
              // min-h-[56px] keeps the whole tab well above the 44px touch
              // minimum even though the glyph itself is 22px.
              className={
                "flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 transition " +
                (active ? "text-accent" : "text-gray-dark")
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
