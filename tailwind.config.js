/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ported from the legacy pygame palette (scenes/__init__.py).
        bg: "#1A1330",
        panel: "#2A1F4D",
        "panel-dark": "#1E1640",
        accent: "#A78BFA",
        "accent-hov": "#8B6BF0",
        border: "#3A2D5F",
        gray: "#A0A0B8",
        "gray-dark": "#6C6890",
        on_accent: "#FFFFFF",
        coin: "#F2B84B",
        "coin-dim": "#A47A2A",
        good: "#7DD37D",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
