export const stitchTheme = {
  colors: {
    background: "#faf8ff",
    surface: "#faf8ff",
    surfaceContainerLow: "#f2f3ff",
    surfaceContainerHigh: "#e2e7ff",
    surfaceContainerHighest: "#dae2fd",
    surfaceContainerLowest: "#ffffff",
    outlineVariant: "#c6c6cd",
    onSurface: "#131b2e",
    onSurfaceVariant: "#45464d",
    secondary: "#515f74",
    primary: "#000000",
    onPrimaryContainer: "#188ace",
    error: "#ba1a1a",
    errorContainer: "#ffdad6"
  },
  shadow: "0 8px 32px rgba(19, 27, 46, 0.06)",
  gradient: "linear-gradient(135deg, #000000 0%, #188ace 100%)",
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px"
  }
} as const;

export type StitchNavItem = {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
};

export type StitchMetricCard = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "info" | "warning" | "danger" | "success";
};
