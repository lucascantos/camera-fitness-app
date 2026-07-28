# Tracking diagnostics

Instrumentation for working out why the rep counters miscount. Dev-only and off
by default; nothing here runs for a normal user.

## The problem it solves

Every tracker in `src/tracking/exercises/` is a fixed-threshold state machine
over a single 3-point joint angle, hardcoded to the **right** side, gated by a
3-frame confirmation. When it miscounts, the app currently tells you nothing
about which of these went wrong:

- the landmark was occluded and MediaPipe guessed (nothing reads `visibility`)
- the angle never reached the threshold band
- the posture gate froze the state machine
- the frame rate collapsed, so the *frame*-based confirm window stretched from
  100 ms to ~750 ms and swallowed the transition
- the room was too dark / the user was backlit and the pose was garbage
- the camera was at an angle that foreshortened the joint

The log captures enough per frame to tell those apart, and pairs each set with
the user's own rep count so the traces are **labelled** rather than guesswork.

## Turning it on

Settings → *Tracking diagnostics*, or append `?debug=1` to the URL (sticky —
it writes the preference). Capture sources are individually toggleable:

| Source | Default | Notes |
|---|---|---|
| Landmarks + tracker state + timing | always | The core payload. |
| Image quality | on | Luminance, contrast, motion, clipping. |
| Device tilt | on | `DeviceOrientationEvent`; asks permission on iOS, absent on desktop. |
| Keyframes | **off** | Stores small JPEG stills of the user. Opt-in, local-only. |
| All 33 landmarks | on | Off logs only the joints trackers read — roughly a third the size. |

Budget about **4 MB per minute** of recording with all 33 landmarks. Storage
lives in its own IndexedDB database (`camera-fitness-app-logs`), separate from
the app's real data, capped at 50 sets, and never included in a Save/Load
backup.

## Getting traces off the phone

The traces are recorded on a phone; they get read on a laptop; there is no
cloud storage in this project. Three routes, tried in order — `Export traces`
picks the best available automatically.

### 1. Dev sink (the good one)

`npm run dev:mobile` already serves the app to the phone over HTTPS on the LAN,
which means the laptop's Vite dev server *is* the origin. A dev-only middleware
(`scripts/viteLogSink.ts`) adds a `POST /__tracking-log` endpoint that writes
uploads straight to `logs/` on the laptop.

```bash
npm run dev:mobile
```

Open the printed `https://<lan-ip>:5173` on the phone (accept the self-signed
certificate warning once), record, then tap **Export traces**. Files land in
`logs/` named `<timestamp>__<exercise>__<id>.json`. The Settings panel shows
"Dev server detected" when this route is live.

This does not violate the project's no-backend rule: the plugin is
`apply: "serve"`, so it does not exist in `vite build` output. Verified — the
production bundle contains the probe URL string and nothing else.

### 2. Share sheet

`navigator.share` with a file attachment, for when the phone isn't on the dev
server — e.g. testing the deployed GitHub Pages build. The user picks
Drive/mail/AirDrop themselves.

### 3. Download

Plain object-URL download. Universal fallback.

## Reading a trace

Each file is an array of `SetLog` (see `src/tracking/log/types.ts`):

- `context` — exercise, target, weight, plus the device facts: actual camera
  `getSettings()`, GPU renderer and whether it's hardware-accelerated, screen
  orientation, UA, core count, memory.
- `frames[]` — per processed frame:
  - `meta` — `dtMs`, `inferenceMs`, `fps`, `skip`, `maxDim`. Check these first;
    a collapsed frame rate changes what `confirmFrames` *means*.
  - `screen` / `world` — flat, rounded. 4 numbers per screen landmark
    (x, y, z, visibility), 3 per world landmark.
  - `tracker` — `angle`, `state`, `target`, `confirm`, `formError`,
    `minVisibility`, `usedWorld`, `angleOther`, `aux`, and **`reason`** — an
    explicit enum for why no rep was counted (`posture-gate`,
    `missing-landmark`, `mid-zone`, `confirm-reset`, …). This is the field that
    turns a trace into an answer.
  - `image` — `luma`, `contrast`, `motion`, `clipLow`, `clipHigh`.
  - `hidden` — set when the tab was backgrounded; rAF stalls there and it looks
    identical to a tracker that stopped counting.
- `countedReps` vs `actualReps` — the label. `events[]` carries timestamped
  "missed a rep" / "counted wrongly" taps.

Two fields exist purely to test hypotheses the current counting path ignores:
`minVisibility` (nothing checks landmark visibility today) and `angleOther`
(the same angle from the other landmark set — divergence means a shaky pose).
Neither gates counting; this pass only measures.

## Live overlay

With diagnostics on, Training shows a strip plotting the tracked angle against
the tracker's own work/rest bands, with vertical ticks for posture-gate frames
(red), missing landmarks (yellow) and counted reps (green), plus a numeric
readout and the two ground-truth buttons. It draws on its own rAF loop into a
canvas rather than re-rendering React per frame — the inference loop already
owns the frame budget.

## What this pass deliberately did not change

Counting behaviour. Every tracker produces the same reps for the same input as
before; the instrumentation only records. Fixing the thresholds, the
right-side-only assumption, the missing visibility checks and the frame-vs-time
confirm window comes after there's data to fix them against.
