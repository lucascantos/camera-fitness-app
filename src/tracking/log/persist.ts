// Assembling and storing the finished trace.

import { drain, type ActiveSet } from "./activeSet";
import { putSetLog, putSetVideo } from "./logDb";
import type { SetCycles, SetLog } from "./types";

export interface SetResult {
  countedReps: number | null;
  actualReps?: number | null;
  note?: string | null;
  cycles?: SetCycles | null;
}

/**
 * Persist a finished set. Returns the stored log id, or null when writing
 * failed — losing a diagnostic trace must never break the workout, so a quota
 * error or a blocked upgrade is swallowed with a console note.
 */
export async function persistSet(a: ActiveSet, result: SetResult): Promise<string | null> {
  // Stop the recording before assembling the log so its size can be recorded.
  const video = a.videoCapture ? await a.videoCapture.stop() : null;

  const log: SetLog = {
    id: a.id,
    startedAt: a.startedAt,
    endedAt: Date.now(),
    context: a.context,
    frames: drain(a),
    truncated: a.wrapped,
    events: a.events,
    countedReps: result.countedReps,
    actualReps: result.actualReps ?? null,
    note: result.note ?? null,
    keyframes: a.keyframes,
    cycles: result.cycles ?? null,
    repTaps: a.repTaps,
    video: video ? { mimeType: video.mimeType, bytes: video.blob.size } : null,
  };

  try {
    await putSetLog(log);
    if (video) await putSetVideo(log.id, video.blob);
    return log.id;
  } catch (e) {
    console.warn("[tracking-log] failed to persist set log", e);
    return null;
  }
}
