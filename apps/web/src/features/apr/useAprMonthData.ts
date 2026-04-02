import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import { DEFAULT_AUDIT, DEFAULT_HISTORY } from "./aprPageModel";
import type { AprAuditResponse, AprHistoryResponse, AprMonthSummary, AprRow, AprSourceType } from "./types";

interface UseAprMonthDataParams {
  selectedMonth: string;
  historySource: AprSourceType;
  enabled: boolean;
  onError: (message: string) => void;
}

interface AprMonthDataState {
  summary: AprMonthSummary | null;
  manualRows: AprRow[];
  audit: AprAuditResponse;
  history: AprHistoryResponse;
  loadingMonthData: boolean;
}

const EMPTY_MONTH_DATA_STATE: AprMonthDataState = {
  summary: null,
  manualRows: [],
  audit: DEFAULT_AUDIT,
  history: DEFAULT_HISTORY,
  loadingMonthData: false
};

export const useAprMonthData = ({
  selectedMonth,
  historySource,
  enabled,
  onError
}: UseAprMonthDataParams) => {
  const requestIdRef = useRef(0);
  const [monthDataState, setMonthDataState] = useState<AprMonthDataState>(EMPTY_MONTH_DATA_STATE);

  const loadMonthData = useCallback(async () => {
    if (!enabled || !selectedMonth) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setMonthDataState((current) => ({ ...current, loadingMonthData: true }));

    try {
      const [summaryResponse, rowsResponse, auditResponse, historyResponse] = await Promise.all([
        aprApi.getMonthSummary(selectedMonth, historySource),
        aprApi.getRows(selectedMonth, "manual"),
        aprApi.getAudit(selectedMonth, "all"),
        aprApi.getHistory(selectedMonth, historySource)
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMonthDataState({
        summary: summaryResponse,
        manualRows: rowsResponse.rows,
        audit: auditResponse,
        history: historyResponse,
        loadingMonthData: false
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMonthDataState((current) => ({ ...current, loadingMonthData: false }));
      onError(error instanceof ApiError ? error.message : "Falha ao carregar dados APR");
    }
  }, [enabled, historySource, onError, selectedMonth]);

  useEffect(() => {
    void loadMonthData();
  }, [loadMonthData]);

  return {
    ...monthDataState,
    loadMonthData
  };
};
