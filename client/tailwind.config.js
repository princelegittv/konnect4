/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        konnect4: {
          bg: "#0B1220",
          card: "#111827",
          gold: "#FACC15",
          "gold-hover": "#FDE047",
          "gold-active": "#EAB308",
          blue: "#2563EB",
          green: "#22C55E",
          red: "#EF4444",
          yellow: "#FACC15",
          text: "#F9FAFB",
          muted: "#9CA3AF",
          board: "#1E3A8A",
          hole: "#0B1220",
          bronze: "#CD7F32",
          silver: "#C0C0C0",
          goldrank: "#FFD700",
          platinum: "#60A5FA",
          diamond: "#22D3EE",
          master: "#A855F7",
        },
      },
      borderRadius: {
        card: "1.5rem",
        pill: "999px",
      },
      boxShadow: {
        surface: "0 24px 60px rgba(0, 0, 0, 0.36)",
        gold: "0 0 20px rgba(250, 204, 21, 0.2)",
        board: "0 24px 44px rgba(7, 12, 26, 0.45)",
        overlay: "0 28px 64px rgba(0, 0, 0, 0.46)",
      },
      zIndex: {
        overlay: "999",
        popover: "1000",
      },
      backdropBlur: {
        overlay: "16px",
      },
      backgroundImage: {
        "legend-rank":
          "linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(168, 85, 247, 0.34))",
        "board-surface": "linear-gradient(180deg, #1E3A8A, #14285C)",
      },
      keyframes: {
        "piece-drop": {
          from: { transform: "translateY(var(--drop-distance))" },
          "72%": { transform: "translateY(10%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "piece-drop": "piece-drop 420ms cubic-bezier(0.18, 0.88, 0.24, 1)",
      },
    },
  },
  plugins: [],
};
