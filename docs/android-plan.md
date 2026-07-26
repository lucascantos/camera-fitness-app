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

## Phase 2 — Installable PWA

1. **Self-host MediaPipe assets** — vendor the WASM bundle and
   `pose_landmarker_lite.task` into `public/models/` (the path CLAUDE.md already
   reserves) and point `WASM_URL` / `MODEL_URL` at same-origin URLs. Removes the CDN
   dependency and makes offline possible.
2. **Add `vite-plugin-pwa`** (Workbox) — generates the service worker + manifest,
   respecting the GitHub Pages `base` sub-path in `vite.config.ts:9`.
3. **Web app manifest** — name, short_name, theme/background color,
   `display: "standalone"`, `orientation: "portrait"`, `start_url` matching the deploy
   path.
4. **App icons** — maskable 192/512 px + Apple touch icon from one source image.
5. **Caching strategy** — precache the app shell + WASM + model (large, so cache-first
   with explicit versioning); IndexedDB stays the source of truth for user data. App
   then cold-starts and runs a full workout offline.
6. **Storage durability** — call `navigator.storage.persist()` so Android doesn't evict
   history under storage pressure. Keep the existing Export/Import backup
   (`src/data/transfer.ts`) as the safety net and surface it on mobile.
7. **Install prompt UX** — capture `beforeinstallprompt` and add a tasteful
   "Install app" affordance.

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
