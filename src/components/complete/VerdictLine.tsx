// The one-line answer to "was that progress?" — shared by the summary row and
// the exercise's detail card so both say the same thing the same way. A dip is
// grey, not red: one off day isn't a failure worth alarming anyone over.

import type { Verdict, VerdictKind } from "@/data/stats/verdict";

const LOOK: Record<VerdictKind, { mark: string; label: string; color: string }> = {
  progress: { mark: "▲", label: "Progress", color: "text-good" },
  holding:  { mark: "=", label: "Holding",  color: "text-ink" },
  below:    { mark: "▼", label: "Dipped",   color: "text-gray-dark" },
};

export function VerdictLine({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  const look = LOOK[verdict.kind];
  return (
    <span className={`${look.color} ${className}`}>
      {look.mark} {look.label}
      <span className="font-semibold"> · {verdict.reason}</span>
    </span>
  );
}
