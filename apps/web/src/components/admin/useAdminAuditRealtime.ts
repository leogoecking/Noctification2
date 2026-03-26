import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { AuditEventItem, PaginationInfo } from "../../types";
import type { AuditFilters } from "./types";
import { createAuditFilters, createPagination } from "./adminRealtimeState";
import { buildAuditQuery } from "./adminRealtimeQueries";
import { getAuditEventTypes, getRecentAuditEvents } from "./adminRealtimeDerived";

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

interface UseAdminAuditRealtimeOptions {
  onError: (message: string) => void;
}

export const useAdminAuditRealtime = ({ onError }: UseAdminAuditRealtimeOptions) => {
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPagination, setAuditPagination] = useState<PaginationInfo>(() => createPagination(20));
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(() => createAuditFilters());
  const [appliedAuditFilters, setAppliedAuditFilters] = useState<AuditFilters>(() => createAuditFilters());
  const [lastAuditRefreshAt, setLastAuditRefreshAt] = useState<string | null>(null);
  const auditRequestIdRef = useRef(0);

  const loadAudit = useCallback(async () => {
    const requestId = auditRequestIdRef.current + 1;
    auditRequestIdRef.current = requestId;
    setLoadingAudit(true);
    try {
      const response = await api.adminAudit(buildAuditQuery(appliedAuditFilters, auditPagination.page));
      if (requestId !== auditRequestIdRef.current) {
        return;
      }

      setAuditEvents(response.events);
      setAuditPagination(response.pagination);
      setLastAuditRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== auditRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar auditoria"));
    } finally {
      if (requestId === auditRequestIdRef.current) {
        setLoadingAudit(false);
      }
    }
  }, [appliedAuditFilters, auditPagination.page, onError]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const recentAuditEvents = useMemo(() => getRecentAuditEvents(auditEvents), [auditEvents]);
  const auditEventTypes = useMemo(() => getAuditEventTypes(auditEvents), [auditEvents]);

  const applyAuditFilters = useCallback(() => {
    setAppliedAuditFilters(auditFilters);
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: auditFilters.limit }));
  }, [auditFilters]);

  const resetAuditFilters = useCallback(() => {
    const nextFilters = createAuditFilters();
    setAuditFilters(nextFilters);
    setAppliedAuditFilters(nextFilters);
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  }, []);

  return {
    auditEvents,
    loadingAudit,
    auditPagination,
    setAuditPagination,
    auditFilters,
    setAuditFilters,
    lastAuditRefreshAt,
    recentAuditEvents,
    auditEventTypes,
    loadAudit,
    applyAuditFilters,
    resetAuditFilters
  };
};
