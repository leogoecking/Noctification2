import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api";
import {
  EMPTY_MANUAL_FORM,
  currentMonthRef,
  openAuditReportPreview,
  sortMonthsDesc
} from "./aprPageModel";
import { aprApi } from "./api";
import type { UseAprPageControllerParams, UseAprPageControllerResult } from "./aprPageControllerTypes";
import { useAprCatalogData } from "./useAprCatalogData";
import { useAprPageDerivedState } from "./useAprPageDerivedState";
import { useAprPageMutations } from "./useAprPageMutations";
import { useAprMonthData } from "./useAprMonthData";
import type { AprMonthItem, AprRow, AprSourceType } from "./types";
import type { AprManualFormState } from "./aprPageModel";

export const useAprPageController = ({
  onError,
  onToast
}: UseAprPageControllerParams): UseAprPageControllerResult => {
  const [months, setMonths] = useState<AprMonthItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthRef);
  const [historySource, setHistorySource] = useState<AprSourceType>("manual");
  const [manualForm, setManualForm] = useState<AprManualFormState>(EMPTY_MANUAL_FORM);
  const [manualPage, setManualPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [manualSearch, setManualSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loadingMonths, setLoadingMonths] = useState(true);

  const orderedMonths = useMemo(() => sortMonthsDesc(months), [months]);
  const hasSelectedMonthInCatalog = months.some((item) => item.monthRef === selectedMonth);

  const { subjectSuggestions, collaboratorSuggestions, loadCatalogData } = useAprCatalogData({
    onError
  });
  const loadMonths = useCallback(async () => {
    setLoadingMonths(true);

    try {
      const response = await aprApi.listMonths();
      setMonths(response.months);
      setSelectedMonth((current) => {
        if (response.months.length === 0) {
          return current;
        }

        return response.months.some((item) => item.monthRef === current)
          ? current
          : sortMonthsDesc(response.months)[0].monthRef;
      });
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar meses APR");
    } finally {
      setLoadingMonths(false);
    }
  }, [onError]);

  const canLoadSelectedMonth = !loadingMonths && (months.length === 0 || hasSelectedMonthInCatalog);
  const { summary, manualRows, audit, history, loadingMonthData, loadMonthData } = useAprMonthData({
    selectedMonth,
    historySource,
    enabled: canLoadSelectedMonth,
    onError
  });

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

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

  const {
    importFiles,
    importResult,
    savingManual,
    uploading,
    setImportFileForSource,
    saveManual,
    removeManual,
    submitImport
  } = useAprPageMutations({
    onError,
    onToast,
    selectedMonth,
    setSelectedMonth,
    manualForm,
    manualFormId: manualForm.id,
    resetManualForm,
    loadMonths,
    loadCatalogData,
    loadMonthData
  });

  const exportAuditPdf = useCallback(() => {
    const exported = openAuditReportPreview(selectedMonth, audit);
    if (!exported) {
      onError("Nao ha divergencias para exportar");
    }
  }, [audit, onError, selectedMonth]);

  const {
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
    visibleCollaboratorSuggestions
  } = useAprPageDerivedState({
    selectedMonth,
    manualRows,
    audit,
    history,
    manualSearch,
    auditSearch,
    historySearch,
    manualPage,
    setManualPage,
    auditPage,
    setAuditPage,
    subjectSuggestions,
    collaboratorSuggestions,
    manualForm
  });

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
    importFiles,
    setImportFileForSource,
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
