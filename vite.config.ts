import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// `base` must match the GitHub Pages sub-path (https://USER.github.io/REPO/)
// for production builds, but stay "/" for local dev so the dev server serves
// the app at the root.
export default defineConfig(async ({ command, mode }) => {
  const plugins: PluginOption[] = [react()];

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
