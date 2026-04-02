import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        panelAlt: "rgb(var(--color-panel-alt) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        accentWarm: "rgb(var(--color-accent-warm) / <alpha-value>)",
        textMain: "rgb(var(--color-text-main) / <alpha-value>)",
        textMuted: "rgb(var(--color-text-muted) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        outlineSoft: "rgb(var(--color-outline-soft) / <alpha-value>)",
        surfaceHigh: "rgb(var(--color-surface-high) / <alpha-value>)",
        surfaceHighest: "rgb(var(--color-surface-highest) / <alpha-value>)"
      },
      boxShadow: {
        xs:   "0 1px 3px rgba(0,0,0,0.07)",
        sm:   "0 4px 12px rgba(0,0,0,0.08)",
        md:   "0 8px 24px rgba(0,0,0,0.10)",
        glow: "0 8px 32px rgba(19, 27, 46, 0.06)"
      },
      borderRadius: {
        sm: "0.5rem",
        md: "0.875rem",
        lg: "1.5rem",
      },
      fontFamily: {
        display: ["Inter", "Segoe UI", "sans-serif"]
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
