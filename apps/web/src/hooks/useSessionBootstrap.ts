import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AuthUser } from "../types";

export const useSessionBootstrap = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const response = await api.me();
      setCurrentUser(response.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return {
    currentUser,
    setCurrentUser,
    loadingSession
  };
};
