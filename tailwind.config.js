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
    },
  },
  plugins: [],
};
