import { useSessionStore, type SceneName } from "@/stores/sessionStore";

const TABS: { name: SceneName; label: string }[] = [
  { name: "home",     label: "Home"     },
  { name: "stats",    label: "Stats"    },
  { name: "settings", label: "Settings" },
];

export function TopNav() {
  const { scene, goTo } = useSessionStore();
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent" />
        <span className="font-bold text-lg tracking-tight">Camera Fitness</span>
      </div>
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.name}
            onClick={() => goTo(t.name)}
            className={
              "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
              (scene === t.name
                ? "bg-accent text-on_accent"
                : "text-gray hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
