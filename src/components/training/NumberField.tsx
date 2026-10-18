// A number you can tap and type, for the in-workout controls (the set's
// weight on the camera-adjust step, the rep count at the end of a set).
// Typing edits a draft; the value is applied on Enter or when the field loses
// focus. Applying per keystroke would be wrong for the weight: a change
// carries forward to later sets that shared the old load (mutateWeight), so
// typing "60" must not pass through "6" on the way.

import { useState } from "react";

export function NumberField({
  value, onCommit, min = 0, max = 999, decimals = false, placeholder, label, fit = false, className = "",
}: {
  value: number;
  onCommit(v: number): void;
  min?: number;
  max?: number;
  /** Allow fractions (weights like 22.5); otherwise whole numbers only. */
  decimals?: boolean;
  /** Shown instead of a 0 value, e.g. "Bodyweight". */
  placeholder?: string;
  label: string;
  /** Size the field to its text, so a unit can sit right after the number. */
  fit?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const asText = (v: number) => (v === 0 && placeholder ? "" : String(v));

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.trim().replace(",", "."));
    setDraft(null);
    if (draft.trim() === "" || !Number.isFinite(parsed)) return;   // keep the old value
    const v = Math.min(max, Math.max(min, decimals ? Math.round(parsed * 100) / 100 : Math.round(parsed)));
    if (v !== value) onCommit(v);
  };

  const text = draft ?? asText(value);
  const chars = Math.max(1, (text || placeholder || "").length);
  return (
    <input
      style={fit ? { width: `${chars + 0.5}ch` } : undefined}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      enterKeyHint="done"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => { setDraft(asText(value)); e.currentTarget.select(); }}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={"bg-transparent text-center tabular-nums focus:outline-none " + className}
    />
  );
}
