import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

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
// this only shrinks the GPU texture upload / internal resize cost per frame.
// On mobile this is the *starting* dimension; the adaptive guardrail below can
// drop it under sustained load.
const INFERENCE_MAX_DIM = 480;
const INFERENCE_MIN_DIM = 320; // floor the adaptive downscale won't go below

// Adaptive performance guardrail. detectForVideo runs synchronously on the main
// thread, so on a thermally-throttling phone it can dominate the frame budget
// and tank the whole UI. We track a smoothed FPS and, when it sits below the
// target, first shrink the inference dimension and then start skipping frames.
const FPS_EMA_ALPHA = 0.1;      // smoothing on the per-frame FPS estimate
const FPS_TARGET = 24;          // above this we relax throttling
const FPS_LOW = 16;             // below this we escalate throttling
const MAX_FRAME_SKIP = 2;       // process 1 of every (skip+1) eligible frames

/**
 * Sets up a PoseLandmarker in VIDEO mode and continuously detects on the
 * supplied <video>. Invokes onResult for every successful detection.
 */
export function useMediapipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  onResult: (r: PoseLandmarkerResult, ts: number) => void,
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
  // Adaptive-throttle state (see constants above). Kept in refs so the tick
  // loop mutates them without re-rendering; `lowPerf` is mirrored to state so
  // the UI can show a hint.
  const fpsEmaRef = useRef<number>(60);
  const lastFrameTsRef = useRef<number>(0);
  const skipRef = useRef<number>(0);        // current frames-to-skip
  const skipCounterRef = useRef<number>(0); // frames skipped since last process
  const maxDimRef = useRef<number>(INFERENCE_MAX_DIM);
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
          // Downscale to a small offscreen canvas to cut per-frame cost. The
          // longest-side target is adaptive (maxDimRef) so a struggling device
          // can shrink it further before we resort to dropping frames.
          const vw = v.videoWidth;
          const vh = v.videoHeight;
          let input: HTMLVideoElement | HTMLCanvasElement = v;
          const scale = vw && vh ? Math.min(1, maxDimRef.current / Math.max(vw, vh)) : 1;
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
          cbRef.current(res, now);

          // ── Measure smoothed processed-frame FPS and adapt ──
          const prev = lastFrameTsRef.current;
          lastFrameTsRef.current = now;
          if (prev) {
            const inst = 1000 / Math.max(1, now - prev);
            const ema = fpsEmaRef.current + FPS_EMA_ALPHA * (inst - fpsEmaRef.current);
            fpsEmaRef.current = ema;
            if (ema < FPS_LOW) {
              // Struggling: shrink the frame first (cheaper quality hit), then
              // start skipping frames once we've hit the resolution floor.
              if (maxDimRef.current > INFERENCE_MIN_DIM) {
                maxDimRef.current = Math.max(INFERENCE_MIN_DIM, maxDimRef.current - 40);
              } else if (skipRef.current < MAX_FRAME_SKIP) {
                skipRef.current += 1;
              }
              setLowPerf(true);
            } else if (ema > FPS_TARGET) {
              // Recovered (e.g. cooled down): unwind throttling in reverse.
              if (skipRef.current > 0) {
                skipRef.current -= 1;
              } else if (maxDimRef.current < INFERENCE_MAX_DIM) {
                maxDimRef.current = Math.min(INFERENCE_MAX_DIM, maxDimRef.current + 40);
              } else {
                setLowPerf(false);
              }
            }
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
