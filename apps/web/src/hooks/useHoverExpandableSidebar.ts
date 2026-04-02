import { useEffect, useRef, useState } from "react";

interface UseHoverExpandableSidebarOptions {
  storageKey: string;
  defaultPinned?: boolean;
  collapseDelayMs?: number;
}

const getInitialPinnedState = (storageKey: string, defaultPinned: boolean): boolean => {
  if (typeof window === "undefined") {
    return defaultPinned;
  }

  const savedState = window.localStorage.getItem(storageKey);

  if (savedState === "true") {
    return true;
  }

  if (savedState === "false") {
    return false;
  }

  return defaultPinned;
};

export const useHoverExpandableSidebar = ({
  storageKey,
  defaultPinned = false,
  collapseDelayMs = 120
}: UseHoverExpandableSidebarOptions) => {
  const [isPinned, setIsPinned] = useState<boolean>(() =>
    getInitialPinnedState(storageKey, defaultPinned)
  );
  const [isHovered, setIsHovered] = useState(false);
  const collapseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, isPinned ? "true" : "false");
  }, [isPinned, storageKey]);

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current !== null) {
        window.clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  return {
    isExpanded: isPinned || isHovered,
    isPinned,
    onMouseEnter: () => {
      if (collapseTimeoutRef.current !== null) {
        window.clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
      setIsHovered(true);
    },
    onMouseLeave: () => {
      if (collapseTimeoutRef.current !== null) {
        window.clearTimeout(collapseTimeoutRef.current);
      }
      collapseTimeoutRef.current = window.setTimeout(() => {
        setIsHovered(false);
        collapseTimeoutRef.current = null;
      }, collapseDelayMs);
    },
    togglePinned: () => setIsPinned((current) => !current)
  };
};
