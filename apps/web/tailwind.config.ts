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
        accentGreen: "rgb(var(--color-accent-green) / <alpha-value>)",
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
        xs:           "0 1px 3px rgba(0,0,0,0.15)",
        sm:           "0 4px 12px rgba(0,0,0,0.25)",
        md:           "0 8px 24px rgba(0,0,0,0.35)",
        "glow-cyan":  "0 0 20px rgba(0, 180, 216, 0.30)",
        "glow-green": "0 0 20px rgba(0, 255, 136, 0.25)",
        "glow-danger":"0 0 20px rgba(255, 23, 68, 0.30)",
        "glow-warn":  "0 0 20px rgba(255, 179, 0, 0.25)"
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "Segoe UI", "sans-serif"]
      },
      animation: {
        "fade-in":    "fadeIn 250ms ease-out",
        "rise-in":    "riseIn 240ms ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" }
        },
        riseIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 6px rgba(0, 255, 136, 0.4)" },
          "50%":      { boxShadow: "0 0 18px rgba(0, 255, 136, 0.7)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
