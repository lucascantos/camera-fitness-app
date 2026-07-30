// Records the camera stream for a set.
//
// Why this exists: landmark traces are *downstream* of the pose model, so they
// can answer "were these thresholds right" but they can never answer "would a
// different inference resolution / model variant / confidence setting have done
// better". Those questions change what the model sees, and the only way to
// compare them fairly is to re-run each option over the same real movement.
//
// We record the raw camera stream rather than the downscaled inference input,
// so a capture can be replayed at any resolution — including higher than the
// one that was used live.
//
// This stores video of the athlete. It is opt-in, never leaves the device
// except through the same explicit export as the traces, and is deleted with
// them.

const BITS_PER_SECOND = 1_500_000; // ~11 MB/min — legible, and not enormous
const TIMESLICE_MS = 1000;         // flush a chunk per second so a crash loses ≤1s

/** Preference order; the first supported one wins. */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

export interface VideoCapture {
  stop(): Promise<{ blob: Blob; mimeType: string } | null>;
  cancel(): void;
  readonly mimeType: string;
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

/** True when this browser can record at all. */
export function canCaptureVideo(): boolean {
  return pickMimeType() !== null;
}

/**
 * Begin recording. Returns null when unsupported or when the stream has no
 * video track — a failure here must never interrupt the workout.
 */
export function startVideoCapture(stream: MediaStream | null): VideoCapture | null {
  if (!stream || stream.getVideoTracks().length === 0) return null;
  const mimeType = pickMimeType();
  if (!mimeType) return null;

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: BITS_PER_SECOND });
  } catch {
    return null;
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  try {
    recorder.start(TIMESLICE_MS);
  } catch {
    return null;
  }

  let settled = false;

  return {
    mimeType,
    cancel() {
      settled = true;
      chunks.length = 0;
      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
    },
    stop() {
      if (settled) return Promise.resolve(null);
      settled = true;
      return new Promise((resolve) => {
        // Guard against onstop never firing — a hung recorder must not hang
        // the end of a set.
        const timer = setTimeout(() => finish(), 3000);
        const finish = () => {
          clearTimeout(timer);
          resolve(chunks.length ? { blob: new Blob(chunks, { type: mimeType }), mimeType } : null);
        };
        recorder.onstop = finish;
        try {
          if (recorder.state === "inactive") finish();
          else recorder.stop();
        } catch {
          finish();
        }
      });
    },
  };
}
