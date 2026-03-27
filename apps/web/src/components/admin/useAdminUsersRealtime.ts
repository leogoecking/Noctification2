import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { OnlineUserItem, UserItem } from "../../types";
import { getActiveUsers, getOnlineSummary, getSelectableUserTargets } from "./adminRealtimeDerived";

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

interface UseAdminUsersRealtimeOptions {
  onError: (message: string) => void;
}

export const useAdminUsersRealtime = ({ onError }: UseAdminUsersRealtimeOptions) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(false);
  const [lastOnlineRefreshAt, setLastOnlineRefreshAt] = useState<string | null>(null);
  const usersRequestIdRef = useRef(0);
  const onlineUsersRequestIdRef = useRef(0);

  const loadUsers = useCallback(async () => {
    const requestId = usersRequestIdRef.current + 1;
    usersRequestIdRef.current = requestId;
    setLoadingUsers(true);
    try {
      const response = await api.adminUsers();
      if (requestId !== usersRequestIdRef.current) {
        return;
      }

      setUsers(response.users);
    } catch (error) {
      if (requestId !== usersRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar usuarios"));
    } finally {
      if (requestId === usersRequestIdRef.current) {
        setLoadingUsers(false);
      }
    }
  }, [onError]);

  const loadOnlineUsers = useCallback(async () => {
    const requestId = onlineUsersRequestIdRef.current + 1;
    onlineUsersRequestIdRef.current = requestId;
    setLoadingOnlineUsers(true);
    try {
      const response = await api.adminOnlineUsers();
      if (requestId !== onlineUsersRequestIdRef.current) {
        return;
      }

      setOnlineUsers(response.users);
      setLastOnlineRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== onlineUsersRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar usuarios online"));
    } finally {
      if (requestId === onlineUsersRequestIdRef.current) {
        setLoadingOnlineUsers(false);
      }
    }
  }, [onError]);

  const upsertUser = useCallback((user: UserItem) => {
    setUsers((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === user.id);
      if (existingIndex === -1) {
        return [...prev, user].sort((left, right) => left.name.localeCompare(right.name));
      }

      const next = [...prev];
      next[existingIndex] = user;
      return next.sort((left, right) => left.name.localeCompare(right.name));
    });

    setOnlineUsers((prev) => {
      if (!user.isActive) {
        return prev.filter((item) => item.id !== user.id);
      }

      return prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              name: user.name,
              login: user.login,
              role: user.role,
              department: user.department,
              jobTitle: user.jobTitle
            }
          : item
      );
    });
  }, []);

  const updateUserActiveState = useCallback((userId: number, isActive: boolean) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? {
              ...item,
              isActive,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );

    if (!isActive) {
      setOnlineUsers((prev) => prev.filter((item) => item.id !== userId));
    }
  }, []);

  const handleOnlineUsersUpdate = useCallback((payload?: { users?: OnlineUserItem[] }) => {
    if (payload?.users) {
      setOnlineUsers(payload.users);
      setLastOnlineRefreshAt(new Date().toISOString());
      return;
    }

    void loadOnlineUsers();
  }, [loadOnlineUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadOnlineUsers();
  }, [loadOnlineUsers]);

  const activeUsers = useMemo(() => getActiveUsers(users), [users]);
  const selectableUserTargets = useMemo(() => getSelectableUserTargets(users), [users]);
  const onlineSummary = useMemo(() => getOnlineSummary(onlineUsers), [onlineUsers]);

  return {
    users,
    onlineUsers,
    loadingUsers,
    loadingOnlineUsers,
    lastOnlineRefreshAt,
    activeUsers,
    selectableUserTargets,
    onlineSummary,
    loadUsers,
    loadOnlineUsers,
    upsertUser,
    updateUserActiveState,
    handleOnlineUsersUpdate
  };
};
