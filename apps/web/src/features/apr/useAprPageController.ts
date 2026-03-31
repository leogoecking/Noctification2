import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import {
  AUDIT_ROWS_PER_PAGE,
  DEFAULT_AUDIT,
  DEFAULT_HISTORY,
  EMPTY_MANUAL_FORM,
  MANUAL_ROWS_PER_PAGE,
  buildDivergentAuditRows,
  buildAprCollaboratorRiskBars,
  clampPage,
  currentMonthRef,
  filterAuditRows,
  filterHistoryRows,
  filterManualRows,
  getVisibleCollaboratorSuggestions,
  getVisibleSubjectSuggestions,
  openAuditReportPreview,
  paginateRows,
  sortMonthsDesc,
  type AprManualFormState
} from "./aprPageModel";
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

interface UseAprPageControllerParams {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export interface UseAprPageControllerResult {
  months: AprMonthItem[];
  orderedMonths: AprMonthItem[];
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  historySource: AprSourceType;
  setHistorySource: React.Dispatch<React.SetStateAction<AprSourceType>>;
  summary: AprMonthSummary | null;
  manualRows: AprRow[];
  subjectSuggestions: AprSubjectSuggestion[];
  collaboratorSuggestions: AprCollaboratorSuggestion[];
  audit: AprAuditResponse;
  history: AprHistoryResponse;
  manualForm: AprManualFormState;
  setManualForm: React.Dispatch<React.SetStateAction<AprManualFormState>>;
  manualPage: number;
  setManualPage: React.Dispatch<React.SetStateAction<number>>;
  auditPage: number;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  manualSearch: string;
  setManualSearch: React.Dispatch<React.SetStateAction<string>>;
  auditSearch: string;
  setAuditSearch: React.Dispatch<React.SetStateAction<string>>;
  historySearch: string;
  setHistorySearch: React.Dispatch<React.SetStateAction<string>>;
  importSource: AprSourceType;
  setImportSource: React.Dispatch<React.SetStateAction<AprSourceType>>;
  importFile: File | null;
  setImportFile: React.Dispatch<React.SetStateAction<File | null>>;
  importResult: AprImportResult | null;
  loadingMonths: boolean;
  loadingMonthData: boolean;
  savingManual: boolean;
  uploading: boolean;
  collaboratorRiskBars: ReturnType<typeof buildAprCollaboratorRiskBars>;
  filteredManualRows: AprRow[];
  manualTotalPages: number;
  paginatedManualRows: AprRow[];
  divergentAuditRows: ReturnType<typeof buildDivergentAuditRows>;
  filteredAuditRows: ReturnType<typeof buildDivergentAuditRows>;
  auditTotalPages: number;
  paginatedAuditRows: ReturnType<typeof buildDivergentAuditRows>;
  filteredHistoryRows: AprHistoryResponse["details"];
  visibleSubjectSuggestions: AprSubjectSuggestion[];
  visibleCollaboratorSuggestions: AprCollaboratorSuggestion[];
  resetManualForm: () => void;
  startEditManual: (row: AprRow) => void;
  saveManual: () => Promise<void>;
  removeManual: (row: AprRow) => Promise<void>;
  submitImport: () => Promise<void>;
  exportAuditPdf: () => void;
}

export const useAprPageController = ({
  onError,
  onToast
}: UseAprPageControllerParams): UseAprPageControllerResult => {
  const [months, setMonths] = useState<AprMonthItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthRef);
  const [historySource, setHistorySource] = useState<AprSourceType>("manual");
  const [summary, setSummary] = useState<AprMonthSummary | null>(null);
  const [manualRows, setManualRows] = useState<AprRow[]>([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState<AprSubjectSuggestion[]>([]);
  const [collaboratorSuggestions, setCollaboratorSuggestions] = useState<AprCollaboratorSuggestion[]>(
    []
  );
  const [audit, setAudit] = useState<AprAuditResponse>(DEFAULT_AUDIT);
  const [history, setHistory] = useState<AprHistoryResponse>(DEFAULT_HISTORY);
  const [manualForm, setManualForm] = useState<AprManualFormState>(EMPTY_MANUAL_FORM);
  const [manualPage, setManualPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [manualSearch, setManualSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [importSource, setImportSource] = useState<AprSourceType>("manual");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<AprImportResult | null>(null);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingMonthData, setLoadingMonthData] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const orderedMonths = useMemo(() => sortMonthsDesc(months), [months]);

  const loadMonths = useCallback(async () => {
    setLoadingMonths(true);

    try {
      const response = await aprApi.listMonths();
      setMonths(response.months);

      if (response.months.length > 0) {
        const monthExists = response.months.some((item) => item.monthRef === selectedMonth);
        if (!monthExists) {
          setSelectedMonth(sortMonthsDesc(response.months)[0].monthRef);
        }
      }
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar meses APR");
    } finally {
      setLoadingMonths(false);
    }
  }, [onError, selectedMonth]);

  const loadSelectedMonth = useCallback(async () => {
    if (!selectedMonth) {
      return;
    }

    setLoadingMonthData(true);

    try {
      const [
        summaryResponse,
        rowsResponse,
        auditResponse,
        historyResponse,
        subjectsResponse,
        collaboratorsResponse
      ] = await Promise.all([
        aprApi.getMonthSummary(selectedMonth, historySource),
        aprApi.getRows(selectedMonth, "manual"),
        aprApi.getAudit(selectedMonth, "all"),
        aprApi.getHistory(selectedMonth, historySource),
        aprApi.listSubjects(),
        aprApi.listCollaborators()
      ]);

      setSummary(summaryResponse);
      setManualRows(rowsResponse.rows);
      setAudit(auditResponse);
      setHistory(historyResponse);
      setSubjectSuggestions(subjectsResponse.subjects);
      setCollaboratorSuggestions(collaboratorsResponse.collaborators);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar dados APR");
    } finally {
      setLoadingMonthData(false);
    }
  }, [historySource, onError, selectedMonth]);

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    void loadSelectedMonth();
  }, [loadSelectedMonth]);

  const resetManualForm = useCallback(() => {
    setManualForm(EMPTY_MANUAL_FORM);
  }, []);

  const startEditManual = useCallback((row: AprRow) => {
    setManualForm({
      id: row.id,
      external_id: row.externalId,
      opened_on: row.openedOn,
      subject: row.subject,
      collaborator: row.collaborator
    });
  }, []);

  const refreshAfterMutation = useCallback(
    async (monthRef?: string) => {
      await loadMonths();
      if (monthRef && monthRef !== selectedMonth) {
        setSelectedMonth(monthRef);
        return;
      }

      await loadSelectedMonth();
    },
    [loadMonths, loadSelectedMonth, selectedMonth]
  );

  const saveManual = useCallback(async () => {
    setSavingManual(true);

    try {
      if (manualForm.id) {
        const response = await aprApi.updateManual(selectedMonth, manualForm.id, manualForm);
        resetManualForm();
        await refreshAfterMutation(response.savedMonthRef);
        onToast(response.moved ? "Lancamento movido e atualizado" : "Lancamento atualizado");
        return;
      }

      const response = await aprApi.createManual(selectedMonth, manualForm);
      resetManualForm();
      await refreshAfterMutation(response.savedMonthRef);
      onToast(response.moved ? "Lancamento criado em outro mes de referencia" : "Lancamento criado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar lancamento manual");
    } finally {
      setSavingManual(false);
    }
  }, [manualForm, onError, onToast, refreshAfterMutation, resetManualForm, selectedMonth]);

  const removeManual = useCallback(
    async (row: AprRow) => {
      try {
        await aprApi.deleteManual(selectedMonth, row.id);
        if (manualForm.id === row.id) {
          resetManualForm();
        }
        await refreshAfterMutation();
        onToast("Lancamento removido");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao remover lancamento");
      }
    },
    [manualForm.id, onError, onToast, refreshAfterMutation, resetManualForm, selectedMonth]
  );

  const submitImport = useCallback(async () => {
    if (!importFile) {
      onError("Selecione um arquivo para importar");
      return;
    }

    setUploading(true);

    try {
      const response = await aprApi.importRows(importSource, importFile, selectedMonth);
      setImportResult(response);
      setImportFile(null);
      await refreshAfterMutation(response.monthRef);
      onToast("Importacao APR concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao importar arquivo APR");
    } finally {
      setUploading(false);
    }
  }, [importFile, importSource, onError, onToast, refreshAfterMutation, selectedMonth]);

  const collaboratorRiskBars = useMemo(
    () => buildAprCollaboratorRiskBars(manualRows, audit, history),
    [manualRows, audit, history]
  );
  const filteredManualRows = useMemo(
    () => filterManualRows(manualRows, manualSearch),
    [manualRows, manualSearch]
  );
  const manualTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredManualRows.length / MANUAL_ROWS_PER_PAGE)),
    [filteredManualRows.length]
  );
  const paginatedManualRows = useMemo(
    () => paginateRows(filteredManualRows, manualPage, MANUAL_ROWS_PER_PAGE),
    [filteredManualRows, manualPage]
  );
  const divergentAuditRows = useMemo(() => buildDivergentAuditRows(audit), [audit]);
  const filteredAuditRows = useMemo(
    () => filterAuditRows(divergentAuditRows, auditSearch),
    [auditSearch, divergentAuditRows]
  );
  const auditTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAuditRows.length / AUDIT_ROWS_PER_PAGE)),
    [filteredAuditRows.length]
  );
  const paginatedAuditRows = useMemo(
    () => paginateRows(filteredAuditRows, auditPage, AUDIT_ROWS_PER_PAGE),
    [auditPage, filteredAuditRows]
  );
  const filteredHistoryRows = useMemo(
    () => filterHistoryRows(history, historySearch),
    [history, historySearch]
  );

  useEffect(() => {
    setManualPage(1);
    setAuditPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    setManualPage((current) => clampPage(current, manualTotalPages));
  }, [manualTotalPages]);

  useEffect(() => {
    setAuditPage((current) => clampPage(current, auditTotalPages));
  }, [auditTotalPages]);

  const exportAuditPdf = useCallback(() => {
    const exported = openAuditReportPreview(selectedMonth, audit);
    if (!exported) {
      onError("Nao ha divergencias para exportar");
    }
  }, [audit, onError, selectedMonth]);

  const visibleSubjectSuggestions = useMemo(
    () => getVisibleSubjectSuggestions(subjectSuggestions, manualForm.subject),
    [manualForm.subject, subjectSuggestions]
  );
  const visibleCollaboratorSuggestions = useMemo(
    () => getVisibleCollaboratorSuggestions(collaboratorSuggestions, manualForm.collaborator),
    [collaboratorSuggestions, manualForm.collaborator]
  );

  return {
    months,
    orderedMonths,
    selectedMonth,
    setSelectedMonth,
    historySource,
    setHistorySource,
    summary,
    manualRows,
    subjectSuggestions,
    collaboratorSuggestions,
    audit,
    history,
    manualForm,
    setManualForm,
    manualPage,
    setManualPage,
    auditPage,
    setAuditPage,
    manualSearch,
    setManualSearch,
    auditSearch,
    setAuditSearch,
    historySearch,
    setHistorySearch,
    importSource,
    setImportSource,
    importFile,
    setImportFile,
    importResult,
    loadingMonths,
    loadingMonthData,
    savingManual,
    uploading,
    collaboratorRiskBars,
    filteredManualRows,
    manualTotalPages,
    paginatedManualRows,
    divergentAuditRows,
    filteredAuditRows,
    auditTotalPages,
    paginatedAuditRows,
    filteredHistoryRows,
    visibleSubjectSuggestions,
    visibleCollaboratorSuggestions,
    resetManualForm,
    startEditManual,
    saveManual,
    removeManual,
    submitImport,
    exportAuditPdf
  };
};
