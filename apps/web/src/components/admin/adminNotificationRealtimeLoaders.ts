import { api, ApiError } from "../../lib/api";
import type { NotificationHistoryItem, PaginationInfo } from "../../types";

interface AdminNotificationsResponse {
  notifications: NotificationHistoryItem[];
  pagination: PaginationInfo;
}

interface LoadAdminNotificationsPageParams<TFilters> {
  requestIdRef: { current: number };
  setLoading: (value: boolean) => void;
  filters: TFilters;
  page: number;
  buildQuery: (filters: TFilters, page: number) => string;
  onSuccess: (response: AdminNotificationsResponse) => void;
  onError: (message: string) => void;
  fallbackMessage: string;
}

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

export const loadAdminNotificationsPage = async <TFilters>({
  requestIdRef,
  setLoading,
  filters,
  page,
  buildQuery,
  onSuccess,
  onError,
  fallbackMessage
}: LoadAdminNotificationsPageParams<TFilters>) => {
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;
  setLoading(true);

  try {
    const response = await api.adminNotifications(buildQuery(filters, page));
    if (requestId !== requestIdRef.current) {
      return;
    }

    onSuccess(response);
  } catch (error) {
    if (requestId !== requestIdRef.current) {
      return;
    }

    onError(toErrorMessage(error, fallbackMessage));
  } finally {
    if (requestId === requestIdRef.current) {
      setLoading(false);
    }
  }
};
