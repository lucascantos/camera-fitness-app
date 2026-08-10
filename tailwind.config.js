/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens resolve to CSS variables defined in src/index.css, so the
        // active theme (default "fitpop" or ".dark") swaps the whole palette.
        bg:           "rgb(var(--bg) / <alpha-value>)",          // page background
        panel:        "rgb(var(--panel) / <alpha-value>)",       // card surface
        "panel-dark": "rgb(var(--panel-dark) / <alpha-value>)",  // inset tile inside a card
        accent:       "rgb(var(--accent) / <alpha-value>)",      // primary red
        "accent-hov": "rgb(var(--accent-hov) / <alpha-value>)",
        border:       "rgb(var(--border) / <alpha-value>)",
        gray:         "rgb(var(--gray) / <alpha-value>)",
        "gray-dark":  "rgb(var(--gray-dark) / <alpha-value>)",
        ink:          "rgb(var(--ink) / <alpha-value>)",         // primary text
        on_accent:    "rgb(var(--on_accent) / <alpha-value>)",
        coin:         "rgb(var(--coin) / <alpha-value>)",
        "coin-dim":   "rgb(var(--coin-dim) / <alpha-value>)",
        good:         "rgb(var(--good) / <alpha-value>)",
        nav:          "rgb(var(--nav) / <alpha-value>)",         // active nav pill background
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,40,0.05)",
      },
      // Motion. Every keyframe animates transform/opacity ONLY — the training
      // screen runs pose inference synchronously on the main thread, so
      // anything triggering layout or paint there steals frames from rep
      // counting (and trips the adaptive quality throttle in useMediapipe).
      // Durations stay short: these fire on every set, every session.
      keyframes: {
        "fade-in":   { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out":  { from: { opacity: "1" }, to: { opacity: "0" } },
        "sheet-up":   {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
        "sheet-down": {
          from: { transform: "translateY(0)" },
          to:   { transform: "translateY(100%)" },
        },
        "page-in": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        "page-out": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(100%)" },
        },
        // Centred dialogs: a touch of scale so they don't just blink in.
        "dialog-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to:   { opacity: "0", transform: "scale(0.96)" },
        },
        // Rep counted: a quick scale punch, replayed by remounting on change.
        pop: {
          "0%":   { transform: "scale(1)" },
          "40%":  { transform: "scale(1.22)" },
          "100%": { transform: "scale(1)" },
        },
        // Idle "alive" motion for a static character portrait. Deliberately
        // constant and slow: tying any portrait movement to the dialogue makes
        // the character twitch on every line, which reads as a glitch.
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.015)" },
        },
        // Set finished / arm switched: one pulse of the whole rep bar.
        "pulse-once": {
          "0%":   { transform: "scale(1)" },
          "35%":  { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":    "fade-in 180ms ease-out both",
        "fade-out":   "fade-out 180ms ease-in both",
        "sheet-up":   "sheet-up 220ms cubic-bezier(0.22,1,0.36,1) both",
        "sheet-down": "sheet-down 200ms cubic-bezier(0.4,0,1,1) both",
        "page-in":    "page-in 240ms cubic-bezier(0.22,1,0.36,1) both",
        "page-out":   "page-out 200ms cubic-bezier(0.4,0,1,1) both",
        "dialog-in":  "dialog-in 180ms cubic-bezier(0.22,1,0.36,1) both",
        "dialog-out": "dialog-out 160ms ease-in both",
        pop:          "pop 220ms cubic-bezier(0.34,1.56,0.64,1) both",
        breathe:      "breathe 5s ease-in-out infinite",
        "pulse-once": "pulse-once 320ms ease-out both",
      },
    },
  },
  plugins: [],
};
