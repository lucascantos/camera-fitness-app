import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { FrameMeta } from "@/tracking/log/types";
import { getDebugOptions } from "@/tracking/log/flag";
import { INFERENCE_MAX_DIM, POSE_OPTIONS, WASM_URL } from "./mediapipe/config";
import { createFrameThrottle } from "./mediapipe/throttle";

export { POSE_MODEL_URL, POSE_OPTIONS } from "./mediapipe/config";

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
  // Throttle state lives in a ref so the tick loop mutates it without
  // re-rendering; `lowPerf` is mirrored to state for the UI hint.
  const throttleRef = useRef(createFrameThrottle());
  const lastFrameTsRef = useRef<number>(0);
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
          baseOptions: {
            modelAssetPath: POSE_OPTIONS.modelAssetPath,
            delegate: POSE_OPTIONS.delegate,
          },
          runningMode: POSE_OPTIONS.runningMode,
          numPoses: POSE_OPTIONS.numPoses,
          minPoseDetectionConfidence: POSE_OPTIONS.minPoseDetectionConfidence,
          minPosePresenceConfidence: POSE_OPTIONS.minPosePresenceConfidence,
          minTrackingConfidence: POSE_OPTIONS.minTrackingConfidence,
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
    const throttle = throttleRef.current;
    throttle.reset();

    const tick = () => {
      const v = videoRef.current;
      const lm = landmarkerRef.current;
      if (v && lm && v.readyState >= 2 && v.currentTime !== lastVideoTimeRef.current) {
        // Frame-skip gate: under load we only process 1 of every (skip+1)
        // eligible frames. Skipped frames still advance rAF cheaply.
        if (throttle.shouldSkip()) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastVideoTimeRef.current = v.currentTime;
        const now = performance.now();
        try {
          const targetDim = getDebugOptions().inferenceDim || INFERENCE_MAX_DIM;
          const input = downscale(v, targetDim, procCanvasRef, procCtxRef);
          const res = lm.detectForVideo(input, now);
          const inferenceMs = performance.now() - now;

          const prev = lastFrameTsRef.current;
          cbRef.current(res, now, {
            ts: now,
            dtMs: prev ? Math.round((now - prev) * 100) / 100 : 0,
            inferenceMs: Math.round(inferenceMs * 100) / 100,
            fps: Math.round(throttle.fps * 10) / 10,
            skip: throttle.skip,
            maxDim: targetDim,
          });

          const slow = throttle.record(inferenceMs, now, prev);
          lastFrameTsRef.current = now;
          if (slow != null) setLowPerf((was) => (was === slow ? was : slow));
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

/**
 * Downscale to a fixed-size offscreen canvas to bound texture upload. Not
 * adaptive: measurement showed inference cost is flat across 320–480 px, so
 * shrinking further only degrades landmarks. The dimension is overridable so a
 * capture session can alternate resolutions within one sitting — between-
 * session variance dominates, so an A/B across sessions would be swamped by it.
 */
function downscale(
  v: HTMLVideoElement,
  targetDim: number,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>,
): HTMLVideoElement | HTMLCanvasElement {
  const vw = v.videoWidth;
  const vh = v.videoHeight;
  const scale = vw && vh ? Math.min(1, targetDim / Math.max(vw, vh)) : 1;
  if (scale >= 1) return v;

  let pc = canvasRef.current;
  if (!pc) {
    pc = document.createElement("canvas");
    canvasRef.current = pc;
    ctxRef.current = pc.getContext("2d");
  }
  const dw = Math.round(vw * scale);
  const dh = Math.round(vh * scale);
  if (pc.width !== dw || pc.height !== dh) {
    pc.width = dw;
    pc.height = dh;
  }
  const ctx = ctxRef.current;
  if (!ctx) return v;
  ctx.drawImage(v, 0, 0, dw, dh);
  return pc;
}
