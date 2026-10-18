// Onboarding's typed-out line: the text appears one letter at a time, and
// words wrapped in *asterisks* are highlighted in the accent red. Screen
// readers get the whole sentence at once instead of the letter-by-letter
// churn.

import { useEffect, useMemo, useState } from "react";

const CHAR_MS = 32;
// A beat after punctuation so sentences read as sentences, not a stream.
const PAUSE_MS: Record<string, number> = { ".": 320, "!": 320, "?": 320, ",": 140 };

interface Segment { text: string; accent: boolean }

/** "a *b* c" → [a ][b (accent)][ c]. */
function parse(script: string): Segment[] {
  return script.split("*").map((text, i) => ({ text, accent: i % 2 === 1 }));
}

/**
 * Letters shown so far, ticking up to the script's length. `instant` jumps to
 * the end (a tap while typing); `onDone` fires once the last letter is out.
 * Mount one per line (key it by step) — it doesn't reset on a new script.
 */
export function useTyped(script: string, instant: boolean, onDone: () => void): number {
  const plain = useMemo(() => script.replace(/\*/g, ""), [script]);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (instant && shown < plain.length) { setShown(plain.length); return; }
    if (shown >= plain.length) { onDone(); return; }
    const prev = plain[shown - 1] ?? "";
    const id = setTimeout(() => setShown((n) => n + 1), CHAR_MS + (PAUSE_MS[prev] ?? 0));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, instant, plain]);

  return shown;
}

export function Typed({ script, shown }: { script: string; shown: number }) {
  let left = shown;
  return (
    <p className="text-3xl font-extrabold text-ink leading-snug" aria-label={script.replace(/\*/g, "")}>
      <span aria-hidden="true">
        {parse(script).map((seg, i) => {
          const part = seg.text.slice(0, Math.max(0, left));
          left -= seg.text.length;
          return part ? (
            <span key={i} className={seg.accent ? "text-accent" : undefined}>{part}</span>
          ) : null;
        })}
      </span>
    </p>
  );
}
