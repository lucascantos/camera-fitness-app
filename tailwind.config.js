/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Default ("fitpop") theme — red on near-white, matching the
        // legacy pygame app's primary palette.
        bg:           "#F0F0F5",   // page background
        panel:        "#FFFFFF",   // card surface
        "panel-dark": "#EDECF2",   // inset tile inside a card
        accent:       "#D8202C",   // primary red
        "accent-hov": "#B81A24",
        border:       "#E2E0EA",
        gray:         "#8A8AA0",
        "gray-dark":  "#6C6890",
        ink:          "#1A1330",   // primary text
        on_accent:    "#FFFFFF",
        coin:         "#F2B84B",
        "coin-dim":   "#A47A2A",
        good:         "#3FB36B",
        nav:          "#1A1330",   // active nav pill background
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
