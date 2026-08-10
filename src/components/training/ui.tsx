// Small presentational pieces shared by the training overlays.

import { useDismissable } from "@/hooks/useDismissable";

export function Backdrop({ children, onClose, align = "center" }: {
  children: React.ReactNode; onClose(): void; align?: "center" | "bottom";
}) {
  const { closing, dismiss } = useDismissable(onClose);
  return (
    <div
      onClick={dismiss}
      className={
        "fixed inset-0 z-50 bg-black/50 flex justify-center " +
        (closing ? "animate-fade-out " : "animate-fade-in ") +
        (align === "bottom" ? "items-end" : "items-center p-4")
      }
    >
      {/* The panel animates, the backdrop only fades. `contents` keeps the
          child a direct flex item of the backdrop so layout is unchanged; the
          panel stops its own click propagation already. */}
      <div
        className={
          "contents " +
          (align === "bottom"
            ? closing ? "[&>*]:animate-sheet-down" : "[&>*]:animate-sheet-up"
            : closing ? "[&>*]:animate-dialog-out" : "[&>*]:animate-dialog-in")
        }
      >
        {children}
      </div>
    </div>
  );
}

export function RoundButton({ children, onClick, label }: {
  children: React.ReactNode; onClick(): void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-black/35 backdrop-blur text-white grid place-items-center shrink-0"
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone }: {
  children: React.ReactNode; tone: "error" | "warn" | "neutral";
}) {
  const cls =
    tone === "error" ? "bg-red-600/85 text-white" :
    tone === "warn"  ? "bg-coin/90 text-white" :
                       "bg-black/55 text-white";
  return (
    <div className={"px-3 py-1 rounded-full text-xs font-semibold text-center " + cls}>
      {children}
    </div>
  );
}

export function Stepper({ label, value, suffix, onMinus, onPlus }: {
  label: string; value: string; suffix: string; onMinus(): void; onPlus(): void;
}) {
  return (
    <div className="mt-3 bg-panel-dark rounded-2xl p-3 flex items-center">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">{label}</div>
        <div className="text-xl font-extrabold text-ink mt-0.5 truncate">
          {value}
          {suffix && <span className="text-sm font-normal text-gray-dark"> {suffix}</span>}
        </div>
      </div>
      <button
        onClick={onMinus}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full bg-panel text-ink text-2xl grid place-items-center shrink-0"
      >
        −
      </button>
      <button
        onClick={onPlus}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full bg-good text-on_accent text-2xl ml-2 grid place-items-center shrink-0"
      >
        +
      </button>
    </div>
  );
}

export function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
