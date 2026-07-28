import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { logSink } from "./scripts/viteLogSink";

// `base` must match the GitHub Pages sub-path (https://USER.github.io/REPO/)
// for production builds, but stay "/" for local dev so the dev server serves
// the app at the root.
export default defineConfig(async ({ command, mode }) => {
  const plugins: PluginOption[] = [
    react(),
    // Dev-only: lets a phone POST its recorded pose traces to ./logs/ on this
    // machine, since there's no cloud storage to move them through. Inert in
    // `vite build` — see scripts/viteLogSink.ts.
    logSink(),
    VitePWA({
      registerType: "autoUpdate",
      // devOptions stays disabled: a service worker fighting Vite's dev-mode
      // HMR causes more confusion than it's worth. Verify installability with
      // `npm run build && npm run preview` instead.
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Camera Fitness",
        short_name: "CamFitness",
        description:
          "Browser-based fitness coach that uses your webcam to count reps " +
          "and track progress. No account, no server — your data stays on " +
          "your device.",
        theme_color: "#12101B",
        background_color: "#12101B",
        display: "standalone",
        orientation: "portrait",
        // start_url / scope intentionally omitted: vite-plugin-pwa derives
        // them from the `base` below (github.io sub-path in prod, "/" in
        // dev), so we don't have to keep two sources of truth in sync.
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Default globPatterns already covers the built JS/CSS/HTML app
        // shell — that's the part we want eagerly precached at SW-install
        // time so the UI itself works offline immediately.
        //
        // The MediaPipe WASM bundle + .task model (~44MB, vendored by
        // scripts/vendor-mediapipe.mjs into public/models/) are deliberately
        // excluded from that eager precache (they'd otherwise be swept in —
        // Workbox's default glob matches .wasm and blows past its 2MiB
        // per-file cap): forcing a 44MB download before the service worker
        // can even activate would make first-load feel broken, especially on
        // mobile data. Instead they're cached lazily — CacheFirst, via the
        // runtimeCaching rule below — the first time a workout actually
        // requests them, and then persist across sessions like any other
        // Workbox runtime cache. That's enough to satisfy "offline after
        // first run" (Phase 2's actual goal) without penalizing everyone who
        // just opens the app to check their stats.
        globIgnores: ["models/**"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/models/"),
            handler: "CacheFirst",
            options: {
              cacheName: "mediapipe-assets-v1",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ];

  // `npm run dev:mobile` (mode "mobile") serves over HTTPS on the LAN so a
  // real phone can reach the dev server — getUserMedia only works in a secure
  // context, and http://<lan-ip> is not one. Uses a self-signed cert
  // (browser will warn once). basic-ssl is optional: if it isn't installed we
  // fall back to plain http rather than failing the whole config.
  if (mode === "mobile") {
    try {
      const basicSsl = (await import("@vitejs/plugin-basic-ssl")).default;
      plugins.push(basicSsl());
    } catch {
      console.warn(
        "[vite] dev:mobile wants HTTPS but @vitejs/plugin-basic-ssl is not " +
          "installed. Run:  npm i -D @vitejs/plugin-basic-ssl",
      );
    }
  }

  return {
    base: command === "build" ? "/camera-fitness-app/" : "/",
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      // Bind to all interfaces in mobile mode so the phone can connect over
      // the LAN; `--host` on the CLI does the same, this makes it automatic.
      host: mode === "mobile",
    },
  };
});
