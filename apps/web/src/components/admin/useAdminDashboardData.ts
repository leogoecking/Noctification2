import { useState } from "react";
import type { AdminMenu } from "./types";
import { useAdminActions } from "./useAdminActions";
import { useAdminRealtimeData } from "./useAdminRealtimeData";

interface UseAdminDashboardDataOptions {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const useAdminDashboardData = ({
  onError,
  onToast
}: UseAdminDashboardDataOptions) => {
  const [menu, setMenu] = useState<AdminMenu>("dashboard");
  const realtime = useAdminRealtimeData({ onError });
  const actions = useAdminActions({
    onError,
    onToast,
    setMenu,
    reloadUsers: realtime.loadUsers,
    reloadUnreadDashboard: realtime.loadUnreadDashboard,
    reloadNotificationHistory: realtime.loadNotificationHistory
  });

  return {
    menu,
    setMenu,
    ...realtime,
    ...actions
  };
};
