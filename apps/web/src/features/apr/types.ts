export type AprSourceType = "manual" | "system";

export interface AprMonthItem {
  id: number;
  monthRef: string;
  createdAt: string;
  updatedAt: string;
  manualCount: number;
  systemCount: number;
  lastManualImportAt: string | null;
  lastSystemImportAt: string | null;
}

export interface AprRow {
  id: number;
  monthRef: string;
  sourceType: AprSourceType;
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AprMonthSummary {
  monthRef: string;
  previousMonthRef: string;
  manualCount: number;
  systemCount: number;
  uniqueCollaborators: number;
  statusGeral: "Conferido" | "Divergente";
  audit: {
    totalSistema: number;
    totalManual: number;
    conferido: number;
    soSistema: number;
    soManual: number;
    totalIds: number;
    divergentes: number;
  };
  history: {
    sourceType: AprSourceType;
    totalAtual: number;
    totalAnterior: number;
    novo: number;
    alterado: number;
    semAlteracao: number;
    totalIds: number;
  };
}

export interface AprAuditDetail {
  externalId: string;
  status: "Conferido" | "Só no sistema" | "Só no manual";
  changed: string[];
  system: AprRow | null;
  manual: AprRow | null;
}

export interface AprAuditResponse {
  monthRef: string;
  summary: {
    totalSistema: number;
    totalManual: number;
    conferido: number;
    soSistema: number;
    soManual: number;
    totalIds: number;
    statusGeral: "Conferido" | "Divergente";
    divergentes: number;
  };
  details: AprAuditDetail[];
}

export interface AprHistoryDetail {
  externalId: string;
  status: "Novo" | "Alterado" | "Sem alteração";
  changed: string[];
  current: AprRow | null;
  previous: AprRow | null;
}

export interface AprHistoryResponse {
  monthRef: string;
  previousMonthRef: string;
  sourceType: AprSourceType;
  summary: {
    totalAtual: number;
    totalAnterior: number;
    novo: number;
    alterado: number;
    semAlteracao: number;
    totalIds: number;
  };
  details: AprHistoryDetail[];
}

export interface AprImportResult {
  monthRef: string;
  sourceType: AprSourceType;
  fileName: string;
  totalValid: number;
  totalInvalid: number;
  duplicates: string[];
  invalid: unknown[];
}

export interface AprManualPayload {
  external_id: string;
  opened_on: string;
  subject: string;
  collaborator: string;
}
