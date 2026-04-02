import { useEffect, useState } from "react";

const getInitialDarkMode = (): boolean => {
  const savedTheme = window.localStorage.getItem("noctification-theme");
  if (savedTheme === "dark") {
    return true;
  }
  if (savedTheme === "light") {
    return false;
  }

  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
};

export const useThemePreference = () => {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("noctification-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return {
    darkMode,
    toggleDarkMode: () => setDarkMode((current) => !current)
  };
};
