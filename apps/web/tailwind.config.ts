import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0b1018",
        panel: "#111827",
        panelAlt: "#182334",
        accent: "#22d3ee",
        accentWarm: "#fb7185",
        textMain: "#d6e2ff",
        textMuted: "#93a6c8",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 211, 238, 0.35), 0 8px 25px rgba(34, 211, 238, 0.12)"
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"]
      },
      animation: {
        "fade-in": "fadeIn 250ms ease-out",
        "rise-in": "riseIn 240ms ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
