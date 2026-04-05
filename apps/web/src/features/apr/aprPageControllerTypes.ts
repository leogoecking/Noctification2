import type { Dispatch, SetStateAction } from "react";
import type {
  AprAuditResponse,
  AprCollaboratorSuggestion,
  AprHistoryResponse,
  AprImportResult,
  AprMonthItem,
  AprMonthSummary,
  AprRow,
  AprSourceType,
  AprSubjectSuggestion
} from "./types";
import type { AprManualFormState } from "./aprPageModel";

export interface UseAprPageControllerParams {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export interface UseAprPageControllerResult {
  months: AprMonthItem[];
  orderedMonths: AprMonthItem[];
  selectedMonth: string;
  setSelectedMonth: Dispatch<SetStateAction<string>>;
  historySource: AprSourceType;
  setHistorySource: Dispatch<SetStateAction<AprSourceType>>;
  summary: AprMonthSummary | null;
  manualRows: AprRow[];
  subjectSuggestions: AprSubjectSuggestion[];
  collaboratorSuggestions: AprCollaboratorSuggestion[];
  audit: AprAuditResponse;
  history: AprHistoryResponse;
  manualForm: AprManualFormState;
  setManualForm: Dispatch<SetStateAction<AprManualFormState>>;
  manualPage: number;
  setManualPage: Dispatch<SetStateAction<number>>;
  auditPage: number;
  setAuditPage: Dispatch<SetStateAction<number>>;
  manualSearch: string;
  setManualSearch: Dispatch<SetStateAction<string>>;
  auditSearch: string;
  setAuditSearch: Dispatch<SetStateAction<string>>;
  historySearch: string;
  setHistorySearch: Dispatch<SetStateAction<string>>;
  importFiles: Record<AprSourceType, File | null>;
  setImportFileForSource: (source: AprSourceType, file: File | null) => void;
  importResult: AprImportResult | null;
  loadingMonths: boolean;
  loadingMonthData: boolean;
  savingManual: boolean;
  uploading: boolean;
  collaboratorRiskBars: Array<ReturnType<typeof import("./aprPageModel").buildAprCollaboratorRiskBars>[number]>;
  filteredManualRows: AprRow[];
  manualTotalPages: number;
  paginatedManualRows: AprRow[];
  divergentAuditRows: ReturnType<typeof import("./aprPageModel").buildDivergentAuditRows>;
  filteredAuditRows: ReturnType<typeof import("./aprPageModel").buildDivergentAuditRows>;
  auditTotalPages: number;
  paginatedAuditRows: ReturnType<typeof import("./aprPageModel").buildDivergentAuditRows>;
  filteredHistoryRows: AprHistoryResponse["details"];
  visibleSubjectSuggestions: AprSubjectSuggestion[];
  visibleCollaboratorSuggestions: AprCollaboratorSuggestion[];
  resetManualForm: () => void;
  startEditManual: (row: AprRow) => void;
  saveManual: () => Promise<void>;
  removeManual: (row: AprRow) => Promise<void>;
  submitImport: (source: AprSourceType) => Promise<void>;
  exportAuditPdf: () => void;
}
