// Controls and formatters for the tracking-diagnostics settings block.

export function Check({ label, hint, on, onToggle }: {
  label: string; hint: string; on: boolean; onToggle(v: boolean): void;
}) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={
        "text-left rounded-2xl p-3 border transition " +
        (on ? "bg-accent/10 border-accent" : "bg-panel-dark border-border")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "w-4 h-4 rounded grid place-items-center text-[10px] shrink-0 " +
            (on ? "bg-accent text-on_accent" : "bg-panel border border-border")
          }
        >
          {on ? "✓" : ""}
        </span>
        <span className="font-bold text-sm text-ink">{label}</span>
      </div>
      <div className="text-xs text-gray-dark mt-1">{hint}</div>
    </button>
  );
}

export function Switch({ on, onToggle }: { on: boolean; onToggle(v: boolean): void }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      role="switch"
      aria-checked={on}
      aria-label="Tracking diagnostics"
      className={
        "w-14 h-8 rounded-full p-1 shrink-0 transition-colors " +
        (on ? "bg-accent" : "bg-panel-dark border border-border")
      }
    >
      <span
        className={
          "block w-6 h-6 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-6" : "translate-x-0")
        }
      />
    </button>
  );
}

export function mb(bytes: number): string {
  return bytes < 1e6 ? `${Math.round(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1)} MB`;
}

export function time(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
