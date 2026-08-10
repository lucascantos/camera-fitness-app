// Shared form controls for the Settings page.

/**
 * A bold section label with an on/off switch on the same row. The caller shows
 * the section's options only while `on` is true.
 */
export function ToggleRow({ label, on, onToggle }: {
  label: string; on: boolean; onToggle(on: boolean): void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-bold">{label}</div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onToggle(!on)}
        className={
          "relative w-11 h-6 rounded-full transition-colors " +
          (on ? "bg-accent" : "bg-panel-dark border border-border")
        }
      >
        <span
          className={
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-panel shadow transition-transform " +
            (on ? "translate-x-5" : "")
          }
        />
      </button>
    </div>
  );
}

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="font-bold mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pill({ selected, onClick, children }: {
  selected: boolean; onClick(): void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
        (selected ? "bg-accent text-on_accent" : "bg-panel-dark text-gray border border-border")
      }
    >
      {children}
    </button>
  );
}

export function Slider({ label, value, onChange }: {
  label: string; value: number; onChange(v: number): void;
}) {
  return (
    <div className="mt-5">
      <div className="flex justify-between items-baseline">
        <div className="font-bold">{label}</div>
        <div className="text-sm text-gray-dark">{Math.round(value * 100)}%</div>
      </div>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
