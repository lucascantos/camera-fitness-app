# Making camera-fitness-app work on Android

## Summary

The app is already a working React + Vite web app with live camera pose-tracking,
IndexedDB persistence, and a GitHub Pages deploy. Getting it onto Android is **not a
rewrite** — it's a mobile-hardening pass plus turning the site into an installable PWA.

**Target:** an installable **Progressive Web App** (Add to Home Screen → app icon →
fullscreen, offline-capable). **Not** the Google Play Store.

**Hosting:** currently GitHub Pages. Self-hosting on the home server is a candidate
route (**TBD**) — see [Hosting note](#hosting-note-github-pages-vs-home-server).

---

## What already works vs. what breaks on a phone

Works today in Chrome-for-Android:
- Client-side everything (no backend to stand up).
- HTTPS on GitHub Pages, so `getUserMedia` and service workers are allowed.
- IndexedDB persistence + Export/Import backup.

Desktop-shaped things that bite on mobile:

| Issue | Where | Impact |
|---|---|---|
| Camera requests fixed `1280×720` landscape | `src/hooks/useCamera.ts:14` | Portrait phone delivers ~`720×1280`; layout/overlay mismatch |
| WASM + `.task` model fetched from external CDNs | `src/hooks/useMediapipe.ts:8` | Blocks any offline / installed experience |
| No PWA manifest, service worker, or icons | — | Not installable; no "Add to Home Screen" |
| GPU-delegate inference, no adaptive throttling | `src/hooks/useMediapipe.ts` | Mid-range Android thermally throttles mid-workout |
| No screen wake-lock | — | Phone dims/sleeps between reps |
| Layout assumes desktop viewport | `src/components/*` | Touch targets, portrait stacking, notch/safe-area |

---

## Phase 1 — Usable in a phone browser  ✅ implemented

Goal: the existing deployed URL is genuinely usable in Chrome-for-Android, portrait.
All six items below are done (verified at 375px: no horizontal overflow, workout
screen stacks camera-over-controls and scrolls, camera-permission errors degrade
gracefully). Item 2's overlay maths already mapped landmarks against live
`videoWidth/videoHeight`, so it needed verification, not a rewrite. On-device camera
testing still needs a real phone via `npm run dev:mobile` (item 6).

1. **Responsive camera constraints** — switch `getUserMedia` from fixed `1280×720` to
   `{ width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }` and drive
   the `<video>` with CSS (`object-fit: cover`, `100dvw` / `100dvh`) so portrait and
   landscape both fill correctly. (`src/hooks/useCamera.ts`)
2. **Orientation-aware overlay** — confirm the pose canvas maps normalized landmarks
   against the actual `videoWidth` / `videoHeight` each frame, not an assumed aspect
   ratio. Test explicitly in portrait, where W < H.
3. **Mobile-first layout pass** — audit every scene (Home, Training, Rest, Complete,
   Stats, Settings, Plans) for touch targets (≥44px), portrait stacking, and
   `env(safe-area-inset-*)` padding. Add `viewport-fit=cover` to the viewport meta.
   (`index.html:5`)
4. **Screen Wake Lock** — request `navigator.wakeLock.request("screen")` while a
   workout is active; release on pause/complete. Keeps the screen awake mid-set.
5. **Perf guardrail** — adaptive throttling in the detect loop: track rolling FPS and,
   below a threshold, skip alternate frames or lower `INFERENCE_MAX_DIM`. Surface a
   "low performance" hint like the existing GPU warning. (`src/hooks/useMediapipe.ts`)
6. **On-device test loop** — real-phone camera testing needs HTTPS. Add an HTTPS dev
   option (`@vitejs/plugin-basic-ssl`, or `vite --host` + a `cloudflared` tunnel) so we
   test on an actual Android device, not just DevTools emulation.

## Phase 2 — Installable PWA  ✅ implemented

1. **Self-host MediaPipe assets** — the WASM bundle (~33MB, all 3 SIMD/module
   variants — MediaPipe's loader picks the right one at runtime) and
   `pose_landmarker_lite.task` (~5.7MB) are vendored into `public/models/` by
   `scripts/vendor-mediapipe.mjs`, which runs automatically via `predev`/`prebuild`
   (also runnable directly as `npm run vendor:mediapipe`). They're **not committed** —
   ~44MB of binaries would bloat the repo forever — instead `.gitignore`'d like
   `node_modules`, and reproduced from the pinned npm dependency (WASM) or a one-time
   download (the model) on every machine. `useMediapipe.ts` now points `WASM_URL` /
   `MODEL_URL` at `${import.meta.env.BASE_URL}models/...`, so it resolves correctly
   under both the dev root and the GitHub Pages sub-path. Verified: pose tracking
   loads and runs with zero CDN requests.
2. **`vite-plugin-pwa`** (Workbox, `generateSW` mode, `registerType: "autoUpdate"`) —
   generates `sw.js` + `manifest.webmanifest`, injects the `<link rel="manifest">` and
   register script into `index.html`. `start_url`/`scope` are left for the plugin to
   derive from `base`, so the GitHub Pages sub-path isn't a second source of truth.
3. **Web app manifest** — name "Camera Fitness", `display: "standalone"`,
   `orientation: "portrait"`, dark theme/background color matching the app's own
   `--bg` token (`#12101B`).
4. **App icons** — maskable-safe 192/512px + apple-touch-icon, a simple lens/target
   mark generated to match the existing accent-red-on-dark palette (no prior logo
   asset existed). `public/icons/`, referenced from the manifest and via explicit
   `<link>` tags in `index.html` (iOS Safari doesn't reliably read manifest icons).
5. **Caching strategy** — the app shell (JS/CSS/HTML, ~418KB) is eagerly precached at
   SW-install time. The 44MB MediaPipe assets are deliberately **excluded** from that
   eager precache (`workbox.globIgnores: ["models/**"]`) — forcing a 44MB download
   before the SW can activate would make first load feel broken, especially on mobile
   data. Instead a `runtimeCaching` rule (`CacheFirst`, cache name
   `mediapipe-assets-v1`, 180-day expiry) caches them the first time a workout actually
   requests them, satisfying "offline after first run" without penalizing everyone who
   just opens the app to check stats.
6. **Storage durability** — `requestPersistentStorage()` in `src/data/db.ts` calls
   `navigator.storage.persist()` once on app init (`App.tsx`), best-effort/fire-and-forget.
   The existing Export/Import backup (`src/data/transfer.ts`) remains the real safety
   net regardless of the browser's answer.
7. **Install prompt UX** — `src/hooks/useInstallPrompt.ts` captures
   `beforeinstallprompt`; a new "Install app" section in Settings shows an Install
   button on Chrome/Edge/Android, manual "Add to Home Screen" instructions on iOS
   Safari (no API there), and renders nothing once already installed
   (`display-mode: standalone` / iOS's `navigator.standalone`).

**Verified end-to-end** via `npm run build` + serving the static output: manifest
resolves with correct `start_url`/`scope`, service worker registers and takes control,
precache holds exactly the 8 app-shell entries (not the 44MB of models), and —
the actual point of this phase — **killing the server and reloading still renders the
full Home screen with real IndexedDB data**, served entirely from the SW cache.

One local-only wrinkle, not a shipping concern: `vite preview`'s static file serving
mis-resolves asset paths when `base` is a non-root sub-path on this machine/Vite
version (falls back to serving `index.html` for every asset request). Confirmed this
only affects the local `vite preview` verification step — GitHub Pages serves the
built `dist/` directly with no such middleware, and the build output itself (verified
by reading `dist/` directly) is correct. If this needs local sub-path preview testing
again, build with a root `base` temporarily to sidestep it.

## Phase 3 — Validation

- Device matrix: at least one low-end and one recent Android phone; Chrome + Samsung
  Internet.
- Verify: camera-permission flow, portrait rep-counting accuracy, offline cold-start,
  wake-lock, install → launch-from-icon, data survives close/reopen.
- Confirm rep-counter math still matches the legacy prototype on-device (CLAUDE.md
  "port verbatim" rule) — thermal throttling changing frame timing must not change
  counts.

---

## Hosting note: GitHub Pages vs. home server

Either host works for a PWA; both must serve **HTTPS** (required for camera + service
workers). Trade-offs to decide later:

**Stay on GitHub Pages**
- Zero ops, already wired up (`.github/workflows/deploy.yml`).
- App lives under a `/camera-fitness-app/` sub-path (already handled by `base`).
- No control over response headers.

**Self-host on the home server** *(TBD)*
- Custom domain + root path (drop the sub-path `base` complexity).
- Full control of response headers — notably `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Embedder-Policy`, which enable cross-origin isolation and can unlock
  WASM threads/SIMD for faster MediaPipe inference.
- Requires: HTTPS cert (Let's Encrypt), reverse proxy, and reachability (dynamic DNS or
  a tunnel) if used outside the LAN.
- Decision pending — not a blocker for Phases 1–2, which are host-agnostic.

---

## Recommendation

Do **Phase 1 → Phase 2** and ship an installable PWA. It's the highest value for the
effort and stays true to the "client-side, no backend, open a URL" mission. Hosting
(GitHub Pages vs. home server) can be decided independently and doesn't gate the work.

## Explicitly out of scope
- Google Play Store listing.
- Native shell (Capacitor / TWA) — revisit only if the web camera pipeline proves
  insufficient.
