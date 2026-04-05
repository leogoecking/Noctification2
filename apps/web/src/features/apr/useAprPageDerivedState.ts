import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  AUDIT_ROWS_PER_PAGE,
  MANUAL_ROWS_PER_PAGE,
  buildDivergentAuditRows,
  buildAprCollaboratorRiskBars,
  clampPage,
  filterAuditRows,
  filterHistoryRows,
  filterManualRows,
  getVisibleCollaboratorSuggestions,
  getVisibleSubjectSuggestions,
  paginateRows,
  type AprManualFormState
} from "./aprPageModel";
import type {
  AprAuditResponse,
  AprCollaboratorSuggestion,
  AprHistoryResponse,
  AprRow,
  AprSubjectSuggestion
} from "./types";

interface UseAprPageDerivedStateParams {
  selectedMonth: string;
  manualRows: AprRow[];
  audit: AprAuditResponse;
  history: AprHistoryResponse;
  manualSearch: string;
  auditSearch: string;
  historySearch: string;
  manualPage: number;
  setManualPage: Dispatch<SetStateAction<number>>;
  auditPage: number;
  setAuditPage: Dispatch<SetStateAction<number>>;
  subjectSuggestions: AprSubjectSuggestion[];
  collaboratorSuggestions: AprCollaboratorSuggestion[];
  manualForm: AprManualFormState;
}

export const useAprPageDerivedState = ({
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
}: UseAprPageDerivedStateParams) => {
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
  const visibleSubjectSuggestions = useMemo(
    () => getVisibleSubjectSuggestions(subjectSuggestions, manualForm.subject),
    [manualForm.subject, subjectSuggestions]
  );
  const visibleCollaboratorSuggestions = useMemo(
    () => getVisibleCollaboratorSuggestions(collaboratorSuggestions, manualForm.collaborator),
    [collaboratorSuggestions, manualForm.collaborator]
  );

  useEffect(() => {
    setManualPage(1);
    setAuditPage(1);
  }, [selectedMonth, setAuditPage, setManualPage]);

  useEffect(() => {
    setManualPage((current) => clampPage(current, manualTotalPages));
  }, [manualTotalPages, setManualPage]);

  useEffect(() => {
    setAuditPage((current) => clampPage(current, auditTotalPages));
  }, [auditTotalPages, setAuditPage]);

  return {
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
  };
};
