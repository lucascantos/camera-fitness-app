import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// `base` must match the GitHub Pages sub-path (https://USER.github.io/REPO/)
// for production builds, but stay "/" for local dev so the dev server serves
// the app at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/camera-fitness-app/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
}));
