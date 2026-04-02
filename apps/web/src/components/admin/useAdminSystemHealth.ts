import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { TaskAutomationHealthItem } from "../../types";

export const useAdminSystemHealth = () => {
  const [taskHealth, setTaskHealth] = useState<TaskAutomationHealthItem | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const loadSystemHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const nextTaskHealth = await api.adminTaskHealth();
      setTaskHealth(nextTaskHealth.health);
    } catch {
      setTaskHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    void loadSystemHealth();
  }, [loadSystemHealth]);

  return {
    taskHealth,
    loadingHealth,
    loadSystemHealth
  };
};
