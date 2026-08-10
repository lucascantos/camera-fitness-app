// Model locations and the tuning constants behind the inference loop.

// Self-hosted (same-origin) rather than the jsdelivr CDN / Google Storage:
// this is what makes the pose model work offline once the PWA's service
// worker has cached them (Phase 2). Vendored into public/models/ by
// scripts/vendor-mediapipe.mjs — see that file and docs/android-plan.md.
// import.meta.env.BASE_URL carries Vite's configured `base` (the
// "/camera-fitness-app/" GitHub Pages sub-path in production, "/" in dev), so
// these resolve correctly under either.
export const WASM_URL = `${import.meta.env.BASE_URL}models/wasm`;
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
export const INFERENCE_MAX_DIM = 480;

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
export const INFER_EMA_ALPHA = 0.1;
export const INFER_MS_HIGH = 150;      // sustained cost above this — start yielding
export const INFER_MS_LOW = 110;       // recovered below this — stop yielding
export const MAX_FRAME_SKIP = 2;       // process 1 of every (skip+1) eligible frames
// The first few inferences are wildly slow while the model warms up: measured
// median 82 ms but p90 561 ms and a 1280 ms worst case over frames 0-9, versus
// 0.7% of steady-state frames exceeding the threshold at all. Feeding those to
// the controller would trip the valve every single set, during the exact window
// the rep tracker uses to establish the athlete's range.
export const WARMUP_FRAMES = 10;

// Purely informational: drives the "low performance" hint in the UI. Not a
// control input, so it cannot feed back into throttling.
export const FPS_EMA_ALPHA = 0.1;
export const FPS_HINT_LOW = 12;

/**
 * The landmarker options, hoisted so the diagnostics log can record exactly
 * what the model ran under. Changing any of these invalidates comparison with
 * older traces, and a trace that doesn't state them can't be interpreted after
 * the fact.
 */
export const POSE_OPTIONS = {
  modelAssetPath: MODEL_URL,
  delegate: "GPU" as const,
  runningMode: "VIDEO" as const,
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

/** Model path, surfaced so the diagnostics log can record which one ran. */
export const POSE_MODEL_URL = MODEL_URL;
