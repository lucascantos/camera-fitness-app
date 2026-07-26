// Vendors the MediaPipe runtime assets into public/models/ so the app can
// load them same-origin instead of from a CDN (required for the PWA to work
// offline — see docs/android-plan.md, Phase 2).
//
// These are build artifacts, not source: they're reproducible from the
// pinned @mediapipe/tasks-vision version (WASM) or a one-time download (the
// pose model), so they're .gitignore'd rather than committed — committing
// ~44MB of binaries would bloat the repo forever, including in every future
// clone. Run via `npm run vendor:mediapipe`, or automatically before
// dev/build (see package.json `predev`/`prebuild`).
//
// Idempotent: skips work that's already done unless --force is passed, so it
// stays cheap and offline-safe on repeat runs (e.g. every `npm run dev`).

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FORCE = process.argv.includes("--force");

const WASM_SRC = path.join(ROOT, "node_modules/@mediapipe/tasks-vision/wasm");
const WASM_DEST = path.join(ROOT, "public/models/wasm");

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MODEL_DEST = path.join(ROOT, "public/models/pose_landmarker_lite.task");

function vendorWasm() {
  if (!existsSync(WASM_SRC)) {
    console.error(
      `[vendor-mediapipe] ${WASM_SRC} not found — run "npm install" first.`,
    );
    process.exitCode = 1;
    return;
  }
  mkdirSync(WASM_DEST, { recursive: true });
  const files = readdirSync(WASM_SRC);
  let copied = 0;
  for (const f of files) {
    const dest = path.join(WASM_DEST, f);
    if (!FORCE && existsSync(dest)) continue;
    copyFileSync(path.join(WASM_SRC, f), dest);
    copied++;
  }
  console.log(
    copied
      ? `[vendor-mediapipe] copied ${copied}/${files.length} WASM file(s) to public/models/wasm/`
      : `[vendor-mediapipe] WASM already vendored (${files.length} files) — skipped`,
  );
}

async function vendorModel() {
  if (!FORCE && existsSync(MODEL_DEST)) {
    console.log("[vendor-mediapipe] pose model already vendored — skipped");
    return;
  }
  mkdirSync(path.dirname(MODEL_DEST), { recursive: true });
  console.log(`[vendor-mediapipe] downloading pose model from ${MODEL_URL} ...`);
  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  await pipeline(res.body, createWriteStream(MODEL_DEST));
  console.log("[vendor-mediapipe] saved public/models/pose_landmarker_lite.task");
}

vendorWasm();
try {
  await vendorModel();
} catch (e) {
  console.error(
    "[vendor-mediapipe] Could not download the pose model (offline?). " +
      "The app will fail to load pose tracking until this succeeds.\n" +
      String(e),
  );
  process.exitCode = 1;
}
