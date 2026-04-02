import { useCallback, useEffect, useState } from "react";
import { normalizePath, type AppPath } from "../components/app/appShell";

export const useAppNavigation = () => {
  const [currentPath, setCurrentPath] = useState<AppPath>(normalizePath(window.location.pathname));

  const navigate = useCallback((path: AppPath, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }

    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return {
    currentPath,
    navigate
  };
};
