// Top navigation bar — matches the legacy pygame "FITNESS APP" header.
// Logo (left) · pill-shaped tab group (center) · avatar + settings (right).

import { useSessionStore, type SceneName } from "@/stores/sessionStore";

const TABS: { name: SceneName; label: string }[] = [
  { name: "home",      label: "Home"      },
  { name: "plans",     label: "Plans"     },
  { name: "exercises", label: "Exercises" },
  { name: "stats",     label: "Stats"     },
];

interface Props {
  /** Initials shown in the user avatar (e.g. "JL"). */
  initials?: string;
}

export function TopNav({ initials = "ME" }: Props) {
  const { scene, goTo } = useSessionStore();
  return (
    <nav className="flex items-center justify-between px-8 py-5 bg-bg">
      {/* Logo */}
      <div className="flex items-center">
        <span className="text-xl font-extrabold tracking-tight text-accent">CAMERA</span>
        <span className="text-xl font-extrabold tracking-tight text-ink ml-1">FITNESS</span>
      </div>

      {/* Tab pill group */}
      <div className="flex items-center bg-panel rounded-full px-2 py-1 shadow-card border border-border">
        {TABS.map((t) => {
          const active = scene === t.name;
          return (
            <button
              key={t.name}
              onClick={() => goTo(t.name)}
              className={
                "px-6 py-2 rounded-full text-sm font-bold transition " +
                (active
                  ? "bg-nav text-white"
                  : "text-gray-dark hover:text-ink")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Avatar + settings */}
      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 rounded-full bg-panel-dark text-ink font-bold grid place-items-center border border-border"
          title="Profile"
        >
          {initials}
        </button>
        <button
          onClick={() => goTo("settings")}
          className="w-10 h-10 rounded-xl bg-panel border border-border grid place-items-center text-ink hover:bg-panel-dark transition"
          title="Settings"
          aria-label="Settings"
        >
          {/* simple gear glyph drawn with svg so we don't ship an icon set */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-2-1.2L14.5 2h-5l-.4 2.5a7.5 7.5 0 0 0-2 1.2l-2.5-1-2 3.5L4.7 9.8a7.4 7.4 0 0 0 0 4.4l-2.1 1.6 2 3.5 2.5-1c.6.5 1.3.9 2 1.2L9.5 22h5l.4-2.5c.7-.3 1.4-.7 2-1.2l2.5 1 2-3.5-2.1-1.6c.1-.4.1-.8.1-1.2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}
