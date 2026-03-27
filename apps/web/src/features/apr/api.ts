import { ApiError } from "../../lib/api";
import { resolveRuntimeApiBase } from "../../lib/runtimeUrls";
import type {
  AprAuditResponse,
  AprHistoryResponse,
  AprImportResult,
  AprManualPayload,
  AprMonthItem,
  AprMonthSummary,
  AprRow,
  AprSourceType
} from "./types";

const APR_API_BASE = resolveRuntimeApiBase(
  import.meta.env.VITE_API_BASE,
  typeof window === "undefined" ? undefined : window.location
).replace(/\/+$/, "");

const parseApiError = async (response: Response): Promise<never> => {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new ApiError(payload?.error ?? `Erro HTTP ${response.status}`, response.status);
};

const requestApr = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${APR_API_BASE}/apr${path}`, {
    ...init,
    credentials: "include"
  });

  if (!response.ok) {
    return parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const aprApi = {
  listMonths: () => requestApr<{ months: AprMonthItem[] }>("/months"),

  getMonthSummary: (monthRef: string, historySource: AprSourceType) =>
    requestApr<AprMonthSummary>(
      `/months/${monthRef}/summary?history_source=${encodeURIComponent(historySource)}`
    ),

  getRows: (monthRef: string, sourceType: AprSourceType = "manual") =>
    requestApr<{ monthRef: string; rows: AprRow[] }>(
      `/months/${monthRef}/rows?source=${encodeURIComponent(sourceType)}`
    ),

  createManual: (monthRef: string, payload: AprManualPayload) =>
    requestApr<{ row: AprRow; savedMonthRef: string; moved: boolean }>(`/months/${monthRef}/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }),

  updateManual: (monthRef: string, entryId: number, payload: AprManualPayload) =>
    requestApr<{ row: AprRow; savedMonthRef: string; moved: boolean }>(
      `/months/${monthRef}/manual/${entryId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    ),

  deleteManual: (monthRef: string, entryId: number) =>
    requestApr<{ ok: true; deletedId: number; monthRef: string }>(
      `/months/${monthRef}/manual/${entryId}`,
      {
        method: "DELETE"
      }
    ),

  getAudit: (monthRef: string, mode: "all" | "missing" = "all") =>
    requestApr<AprAuditResponse>(`/months/${monthRef}/audit?mode=${encodeURIComponent(mode)}`),

  getHistory: (monthRef: string, sourceType: AprSourceType) =>
    requestApr<AprHistoryResponse>(
      `/months/${monthRef}/history?source=${encodeURIComponent(sourceType)}`
    ),

  importRows: async (sourceType: AprSourceType, file: File, refMonth: string) => {
    const formData = new FormData();
    formData.set("refMonth", refMonth);
    formData.set("file", file);

    return requestApr<AprImportResult>(`/import/${sourceType}`, {
      method: "POST",
      body: formData
    });
  }
};
