import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
// "lite" model: ~2-3x faster inference than "full", at a small accuracy cost.
// This is the dominant FPS lever since detectForVideo runs synchronously.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// We downscale each camera frame to this longest-side before inference.
// Landmarks come back normalised (0..1), so the overlay mapping is unaffected;
// this only shrinks the GPU texture upload / internal resize cost per frame.
const INFERENCE_MAX_DIM = 480;

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
        lastVideoTimeRef.current = v.currentTime;
        const now = performance.now();
        try {
          // Downscale to a small offscreen canvas to cut per-frame cost.
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
          cbRef.current(res, now);
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

  return { ready, error };
}
