// Dev-only gate for tracking diagnostics.
//
// Recording is off for normal users and costs nothing when disabled: the
// recorder's hot path checks this flag first and returns immediately. Enable
// it with ?debug=1 in the URL (sticky — it writes the preference), or from the
// Settings screen.
//
// localStorage rather than IndexedDB on purpose: this is a small UI preference
// that's fine to lose (CLAUDE.md development rule 2), and the flag has to be
// readable synchronously from the per-frame path before IndexedDB has opened.

const KEY = "cfa.debugTracking";

export interface DebugOptions {
  enabled: boolean;
  /** Sample luminance/contrast/motion from the camera frame. */
  imageStats: boolean;
  /** Listen to DeviceOrientationEvent (needs a permission grant on iOS). */
  orientation: boolean;
  /** Store periodic JPEG stills so a failed set can be watched back. */
  keyframes: boolean;
  /** Log all 33 landmarks rather than only those the tracker reads. */
  fullLandmarks: boolean;
  /**
   * Record the camera stream for the set, so upstream changes — inference
   * resolution, model variant, confidence parameters — can be re-run offline
   * against the same real movement. Landmark traces cannot answer those
   * questions: they are downstream of the thing being changed.
   */
  video: boolean;
  /**
   * Force the inference longest-side, for interleaved resolution A/B tests.
   * 0 uses the built-in default.
   */
  inferenceDim: number;
  /**
   * Show a large tap target during the set. Each tap timestamps one real rep,
   * turning "counted 4, actual 10" into knowing *which* six were missed.
   */
  repTap: boolean;
}

const DEFAULTS: DebugOptions = {
  enabled: false,
  imageStats: true,
  orientation: true,
  keyframes: false, // opt-in: stores images of the user
  fullLandmarks: true,
  video: false,     // opt-in: records the user
  inferenceDim: 0,  // 0 = built-in default
  repTap: false,
};

let _opts: DebugOptions = { ...DEFAULTS };
const listeners = new Set<(o: DebugOptions) => void>();

/** Read the stored flags and apply any ?debug= URL override. Call once at boot. */
export function initDebugOptions(): DebugOptions {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) _opts = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DebugOptions>) };
  } catch {
    // Corrupt/blocked storage — fall through to defaults.
  }
  try {
    const q = new URLSearchParams(window.location.search).get("debug");
    if (q === "1" || q === "true") _opts = { ..._opts, enabled: true };
    else if (q === "0" || q === "false") _opts = { ..._opts, enabled: false };
    if (q != null) persist();
  } catch {
    // No URL access (SSR/tests) — ignore.
  }
  return _opts;
}

export function getDebugOptions(): DebugOptions {
  return _opts;
}

/** The hot-path check. Kept trivial so the per-frame cost is a property read. */
export function isDebugLogging(): boolean {
  return _opts.enabled;
}

export function setDebugOptions(patch: Partial<DebugOptions>): DebugOptions {
  _opts = { ..._opts, ...patch };
  persist();
  for (const fn of listeners) fn(_opts);
  return _opts;
}

/** Subscribe to flag changes; returns an unsubscribe function. */
export function onDebugOptionsChange(fn: (o: DebugOptions) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(_opts));
  } catch {
    // Private mode / quota — the flag just won't survive a reload.
  }
}
