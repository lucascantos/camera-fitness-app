// End of a workout — the payoff screen. It has to make the athlete *feel*
// that the session counted, so it's staged rather than dumped. The "SESSION
// COMPLETE!" moment itself happens before this, in the final set's Done modal
// (training/SessionDone). Then:
//
//   1. "Session Summary" and the session totals fade in.
//   2. Exercises arrive one at a time; each bar fills to today's volume, past
//      a ghost of last time when it went up.
//   3. Records pop in (★ NEW BEST / REP BEST) with a fanfare.
//   4. The Home button appears, and the summary becomes the first card of a
//      swipeable carousel — one detail card per exercise after it.
//
// A tap anywhere skips straight to the final state.

import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { fanfare, repBeep, setCompleteChime } from "@/audio/sfx";
import { buildSummary } from "./complete/summary";
import { useAwardSession } from "./complete/useAwardSession";
import { useCountUp, useTimeline } from "./complete/useTimeline";
import { SummaryRow } from "./complete/SummaryRow";
import { Carousel, Dots } from "./complete/Carousel";
import { DetailCard } from "./complete/DetailCard";

const HEADER_MS = 700;
const ROW_MS = 800;
const LAST_ROW_MS = 1200;   // let the final bar finish filling
const RECORDS_MS = 700;

export function Complete() {
  const { session, endSession } = useSessionStore();
  // Frozen on the first render — before useAwardSession's effect writes this
  // session into history, which would make every row compare against itself.
  const [summary] = useState(() => (session ? buildSummary(session) : null));
  useAwardSession(session);

  const n = summary?.rows.length ?? 0;
  // Stage 0 is the header; stage k shows k exercises; then records; then Home.
  const delays = [
    HEADER_MS,
    ...Array.from({ length: n }, (_, i) => (i === n - 1 ? LAST_ROW_MS : ROW_MS)),
    RECORDS_MS,
  ];
  const { stage, skipped, done, skip } = useTimeline(delays);
  const recordsStage = n + 1;
  const anyRecord = summary?.rows.some((r) => r.best) ?? false;

  // Sound follows the sequence; a skip goes quiet.
  useEffect(() => {
    if (skipped) return;
    if (stage >= 1 && stage < recordsStage) repBeep();
    else if (stage === recordsStage) (anyRecord ? fanfare : setCompleteChime)();
  }, [stage, skipped, recordsStage, anyRecord]);

  const [page, setPage] = useState(0);
  const totalReps = useCountUp(summary?.totalReps ?? 0, true, skipped);
  const totalKg = useCountUp(summary?.totalKg ?? 0, true, skipped);

  if (!session || !summary) return null;
  const rowsShown = Math.min(n, stage);

  const summaryCard = (
    <div key="summary" className="bg-panel rounded-3xl p-5 border border-border shadow-card">
      <div className={skipped ? "" : "animate-fade-in"}>
        <div className="text-[11px] font-bold tracking-widest text-gray-dark">WORKOUT DONE</div>
        <h1 className="text-3xl font-black text-ink leading-none mt-1">Session Summary</h1>
        <div className="text-gray-dark font-semibold mt-2 tabular-nums">
          {n} {n === 1 ? "exercise" : "exercises"} · {Math.round(totalReps)} reps
          {summary.totalKg > 0 && <> · {Math.round(totalKg).toLocaleString()} kg lifted</>}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {summary.rows.slice(0, rowsShown).map((row, i) => (
          <SummaryRow
            key={row.exercise}
            row={row}
            highlight={stage >= recordsStage}
            instant={skipped}
            onOpen={done ? () => setPage(i + 1) : undefined}
          />
        ))}
      </div>
    </div>
  );

  // The detail cards join once the reveal is over, so the first thing that
  // appears beside the summary is the next card peeking in — the swipe cue.
  const pages = done
    ? [summaryCard, ...summary.rows.map((row, i) => (
        <DetailCard key={row.exercise} row={row} active={page === i + 1} instant={false} />
      ))]
    : [summaryCard];

  return (
    <div onClick={done ? undefined : skip} className="min-h-full p-4 pb-8 select-none">
      <Carousel index={page} onIndex={setPage}>{pages}</Carousel>

      {done && (
        <div className={skipped ? "" : "animate-row-in"}>
          {n > 0 && <Dots count={n + 1} index={page} onIndex={setPage} />}
          <button
            onClick={endSession}
            className="mt-5 w-full bg-accent text-on_accent font-extrabold text-xl py-4 rounded-2xl shadow-lg"
          >
            Home
          </button>
        </div>
      )}
    </div>
  );
}
