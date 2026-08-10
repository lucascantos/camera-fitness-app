// The responsiveness valve and the FPS reporter. See ./config for why these
// are two separate signals — the throttle must not react to its own output.

import {
  FPS_EMA_ALPHA, FPS_HINT_LOW, INFER_EMA_ALPHA, INFER_MS_HIGH, INFER_MS_LOW,
  MAX_FRAME_SKIP, WARMUP_FRAMES,
} from "./config";

export interface FrameThrottle {
  /** Current frames-to-skip level. */
  readonly skip: number;
  /** Smoothed processed-frame rate, for the UI hint only. */
  readonly fps: number;
  reset(): void;
  /** True when this eligible frame should be dropped without processing. */
  shouldSkip(): boolean;
  /**
   * Feed one processed frame back in. Returns whether the device looks slow,
   * or null on the first frame, when there is no interval to measure yet.
   */
  record(inferenceMs: number, now: number, prevTs: number): boolean | null;
}

export function createFrameThrottle(): FrameThrottle {
  let inferEma = 0;
  let framesSeen = 0;
  let fpsEma = 60;
  let skip = 0;
  let skipCounter = 0;

  return {
    get skip() { return skip; },
    get fps() { return fpsEma; },

    reset() {
      framesSeen = 0;
      inferEma = 0;
    },

    shouldSkip() {
      if (skipCounter < skip) {
        skipCounter += 1;
        return true;
      }
      skipCounter = 0;
      return false;
    },

    record(inferenceMs, now, prevTs) {
      // The control signal is how long inference actually took. It is
      // independent of how often we choose to run it, so unlike the old
      // FPS-based controller it cannot be pushed around by its own output.
      if (++framesSeen > WARMUP_FRAMES) {
        inferEma = inferEma
          ? inferEma + INFER_EMA_ALPHA * (inferenceMs - inferEma)
          : inferenceMs;
        if (inferEma > INFER_MS_HIGH) {
          // Long enough to visibly block the UI — hand frames back. This costs
          // throughput; it buys responsiveness.
          if (skip < MAX_FRAME_SKIP) skip += 1;
        } else if (inferEma < INFER_MS_LOW && skip > 0) {
          skip -= 1;
        }
      }

      if (!prevTs) return null;
      const inst = 1000 / Math.max(1, now - prevTs);
      fpsEma += FPS_EMA_ALPHA * (inst - fpsEma);
      return fpsEma < FPS_HINT_LOW;
    },
  };
}
