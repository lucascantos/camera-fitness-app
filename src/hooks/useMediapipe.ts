import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { FrameMeta } from "@/tracking/log/types";

// Self-hosted (same-origin) rather than the jsdelivr CDN / Google Storage:
// this is what makes the pose model work offline once the PWA's service
// worker has cached them (Phase 2). Vendored into public/models/ by
// scripts/vendor-mediapipe.mjs — see that file and docs/android-plan.md.
// import.meta.env.BASE_URL carries Vite's configured `base` (the
// "/camera-fitness-app/" GitHub Pages sub-path in production, "/" in dev), so
// these resolve correctly under either.
const WASM_URL = `${import.meta.env.BASE_URL}models/wasm`;
// "lite" model: ~2-3x faster inference than "full", at a small accuracy cost.
// This is the dominant FPS lever since detectForVideo runs synchronously.
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;

// We downscale each camera frame to this longest-side before inference.
// Landmarks come back normalised (0..1), so the overlay mapping is unaffected;
// this bounds the GPU texture upload per frame.
//
// Fixed, not adaptive. There used to be a ladder that shrank this to 320 under
// load. Measured over 8,608 recorded frames on a Mali-G78, it bought nothing:
//
//     480 px — median inference 79.2 ms  (521 frames)
//     320 px — median inference 81.4 ms  (8,006 frames)
//
// A 2.25× reduction in pixels for no gain, because inference cost here is
// dominated by fixed overhead (texture upload, GPU sync, model execution) and
// not by input area. The ladder was therefore pure landmark-quality loss, and
// landmark quality is what limits rep counting — see docs/calibration-devlog.md.
const INFERENCE_MAX_DIM = 480;

// Responsiveness valve. detectForVideo runs synchronously on the main thread,
// so when a single inference gets long enough the whole UI stops responding.
// Skipping frames does NOT make inference faster and does NOT raise throughput
// — measured, it lowers it (skip 0: 132 ms between frames; skip 2: 161 ms) —
// so it exists only to hand time back to the UI on a device that genuinely
// cannot keep up, never as a frame-rate optimisation.
//
// It is therefore driven by *inference duration*, which is the real cost
// signal. The previous controller keyed off processed-frame FPS, which
// frame-skipping suppresses by construction: escalating drove the metric it was
// reacting to further down, so it ratcheted to maximum within seconds and its
// recovery branch (ema > 24) was unreachable while skipping was active. Every
// trace captured before this fix ran pinned at 320 px / skip 2.
const INFER_EMA_ALPHA = 0.1;
const INFER_MS_HIGH = 150;      // sustained cost above this — start yielding
const INFER_MS_LOW = 110;       // recovered below this — stop yielding
const MAX_FRAME_SKIP = 2;       // process 1 of every (skip+1) eligible frames
// The first few inferences are wildly slow while the model warms up: measured
// median 82 ms but p90 561 ms and a 1280 ms worst case over frames 0-9, versus
// 0.7% of steady-state frames exceeding the threshold at all. Feeding those to
// the controller would trip the valve every single set, during the exact window
// the rep tracker uses to establish the athlete's range.
const WARMUP_FRAMES = 10;

// Purely informational: drives the "low performance" hint in the UI. Not a
// control input, so it cannot feed back into throttling.
const FPS_EMA_ALPHA = 0.1;
const FPS_HINT_LOW = 12;

/** Model path, surfaced so the diagnostics log can record which one ran. */
export const POSE_MODEL_URL = MODEL_URL;

/**
 * Sets up a PoseLandmarker in VIDEO mode and continuously detects on the
 * supplied <video>. Invokes onResult for every successful detection.
 *
 * The third callback argument carries the frame's timing and throttle state,
 * which the diagnostics log records per frame. Timing is worth watching:
 * anything downstream that counts *frames* rather than elapsed time silently
 * changes meaning when the frame rate moves.
 */
export function useMediapipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  onResult: (r: PoseLandmarkerResult, ts: number, meta: FrameMeta) => void,
  enabled: boolean,
) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  // Offscreen canvas used to downscale frames before inference.
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Throttle state (see constants above). Kept in refs so the tick loop mutates
  // them without re-rendering; `lowPerf` is mirrored to state for the UI hint.
  const inferEmaRef = useRef<number>(0);    // smoothed inference duration, ms
  const framesSeenRef = useRef<number>(0);  // for the warm-up guard
  const fpsEmaRef = useRef<number>(60);     // reporting only
  const lastFrameTsRef = useRef<number>(0);
  const skipRef = useRef<number>(0);        // current frames-to-skip
  const skipCounterRef = useRef<number>(0); // frames skipped since last process
  const [lowPerf, setLowPerf] = useState(false);

  // Keep latest callback without re-creating the landmarker.
  const cbRef = useRef(onResult);
  useEffect(() => { cbRef.current = onResult; }, [onResult]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const lm = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (disposed) { lm.close(); return; }
        landmarkerRef.current = lm;
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      disposed = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ready) return;
    framesSeenRef.current = 0;
    inferEmaRef.current = 0;
    const tick = () => {
      const v = videoRef.current;
      const lm = landmarkerRef.current;
      if (v && lm && v.readyState >= 2 && v.currentTime !== lastVideoTimeRef.current) {
        // Frame-skip gate: under load we only process 1 of every (skip+1)
        // eligible frames. Skipped frames still advance rAF cheaply.
        if (skipCounterRef.current < skipRef.current) {
          skipCounterRef.current += 1;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        skipCounterRef.current = 0;
        lastVideoTimeRef.current = v.currentTime;
        const now = performance.now();
        try {
          // Downscale to a fixed-size offscreen canvas to bound texture upload.
          // Not adaptive: measurement showed inference cost is flat across
          // 320–480 px, so shrinking further only degrades landmarks.
          const vw = v.videoWidth;
          const vh = v.videoHeight;
          let input: HTMLVideoElement | HTMLCanvasElement = v;
          const scale = vw && vh ? Math.min(1, INFERENCE_MAX_DIM / Math.max(vw, vh)) : 1;
          if (scale < 1) {
            let pc = procCanvasRef.current;
            if (!pc) {
              pc = document.createElement("canvas");
              procCanvasRef.current = pc;
              procCtxRef.current = pc.getContext("2d");
            }
            const dw = Math.round(vw * scale);
            const dh = Math.round(vh * scale);
            if (pc.width !== dw || pc.height !== dh) {
              pc.width = dw;
              pc.height = dh;
            }
            const pctx = procCtxRef.current;
            if (pctx) {
              pctx.drawImage(v, 0, 0, dw, dh);
              input = pc;
            }
          }
          const res = lm.detectForVideo(input, now);
          const inferenceMs = performance.now() - now;

          const prev = lastFrameTsRef.current;
          cbRef.current(res, now, {
            ts: now,
            dtMs: prev ? Math.round((now - prev) * 100) / 100 : 0,
            inferenceMs: Math.round(inferenceMs * 100) / 100,
            fps: Math.round(fpsEmaRef.current * 10) / 10,
            skip: skipRef.current,
            maxDim: INFERENCE_MAX_DIM,
          });

          // ── Adapt on inference cost, and report FPS separately ──
          // The control signal is how long inference actually took. It is
          // independent of how often we choose to run it, so unlike the old
          // FPS-based controller it cannot be pushed around by its own output.
          if (++framesSeenRef.current > WARMUP_FRAMES) {
            const ema = inferEmaRef.current
              ? inferEmaRef.current + INFER_EMA_ALPHA * (inferenceMs - inferEmaRef.current)
              : inferenceMs;
            inferEmaRef.current = ema;
            if (ema > INFER_MS_HIGH) {
              // Long enough to visibly block the UI — hand frames back. This
              // costs throughput; it buys responsiveness.
              if (skipRef.current < MAX_FRAME_SKIP) skipRef.current += 1;
            } else if (ema < INFER_MS_LOW && skipRef.current > 0) {
              skipRef.current -= 1;
            }
          }

          lastFrameTsRef.current = now;
          if (prev) {
            const inst = 1000 / Math.max(1, now - prev);
            fpsEmaRef.current += FPS_EMA_ALPHA * (inst - fpsEmaRef.current);
            const slow = fpsEmaRef.current < FPS_HINT_LOW;
            setLowPerf((was) => (was === slow ? was : slow));
          }
        } catch {
          // detectForVideo can throw mid-shutdown — ignore.
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, ready, videoRef]);

  return { ready, error, lowPerf };
}
