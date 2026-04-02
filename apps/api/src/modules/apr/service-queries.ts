import type Database from "better-sqlite3";
import { compareAprBases, compareAprHistory } from "./compare";
import { getPreviousMonth, normalizeComparableText, toParsedAprRow } from "./model";
import {
  listAllAprEntries,
  listAprCollaborators,
  listAprEntriesByMonth,
  listAprMonths,
  listAprSubjects,
  rebuildAprCollaboratorCatalog,
  type AprMonthListRow,
  type AprSourceType
} from "./repository";
import type { AprAuditFilters } from "./validators";

export { compareAprBases, compareAprHistory } from "./compare";

const applyAprAuditFilters = (
  details: ReturnType<typeof compareAprBases>["details"],
  filters: AprAuditFilters
) => {
  let filtered = details.slice();

  if (filters.mode === "missing") {
    filtered = filtered.filter((item) => item.status !== "Conferido");
  }

  const search = normalizeComparableText(filters.search);
  const collaborator = normalizeComparableText(filters.collaborator);
  const subject = normalizeComparableText(filters.subject);
  const date = filters.date ?? "";

  if (search) {
    filtered = filtered.filter((item) =>
      [
        item.externalId,
        item.system?.subject,
        item.manual?.subject,
        item.system?.collaborator,
        item.manual?.collaborator
      ]
        .map((value) => normalizeComparableText(value))
        .join(" | ")
        .includes(search)
    );
  }

  if (collaborator) {
    filtered = filtered.filter((item) =>
      [item.system?.collaborator, item.manual?.collaborator].some((value) =>
        normalizeComparableText(value).includes(collaborator)
      )
    );
  }

  if (subject) {
    filtered = filtered.filter((item) =>
      [item.system?.subject, item.manual?.subject].some((value) =>
        normalizeComparableText(value).includes(subject)
      )
    );
  }

  if (date) {
    filtered = filtered.filter((item) =>
      [item.system?.openedOn, item.manual?.openedOn].some((value) => value === date)
    );
  }

  return filtered;
};

const buildAprAuditSummary = (audit: ReturnType<typeof compareAprBases>) => ({
  ...audit.summary,
  statusGeral: audit.summary.soSistema || audit.summary.soManual ? "Divergente" : "Conferido",
  divergentes: audit.summary.soSistema + audit.summary.soManual
});

export const listAprMonthsService = (db: Database.Database): { months: AprMonthListRow[] } => ({
  months: listAprMonths(db)
});

export const listAprCollaboratorsService = (
  db: Database.Database,
  params: { search?: string }
) => {
  const collaborators = listAprCollaborators(db, params.search);
  if (collaborators.length === 0 && listAllAprEntries(db).length > 0) {
    rebuildAprCollaboratorCatalog(db);
    return {
      collaborators: listAprCollaborators(db, params.search)
    };
  }

  return {
    collaborators
  };
};

export const listAprSubjectsService = (
  db: Database.Database,
  params: { search?: string }
) => ({
  subjects: listAprSubjects(db, params.search)
});

export const getAprRowsService = (
  db: Database.Database,
  params: { monthRef: string; sourceType?: AprSourceType }
) => ({
  monthRef: params.monthRef,
  rows: listAprEntriesByMonth(db, params.monthRef, params.sourceType).map(toParsedAprRow)
});

export const getAprAuditService = (
  db: Database.Database,
  params: { monthRef: string; filters: AprAuditFilters }
) => {
  const systemRows = listAprEntriesByMonth(db, params.monthRef, "system").map(toParsedAprRow);
  const manualRows = listAprEntriesByMonth(db, params.monthRef, "manual").map(toParsedAprRow);
  const audit = compareAprBases(systemRows, manualRows);

  return {
    monthRef: params.monthRef,
    summary: buildAprAuditSummary(audit),
    details: applyAprAuditFilters(audit.details, params.filters)
  };
};

export const getAprHistoryService = (
  db: Database.Database,
  params: { monthRef: string; sourceType: AprSourceType }
) => {
  const previousMonthRef = getPreviousMonth(params.monthRef);
  const currentRows = listAprEntriesByMonth(db, params.monthRef, params.sourceType).map(toParsedAprRow);
  const previousRows = listAprEntriesByMonth(db, previousMonthRef, params.sourceType).map(toParsedAprRow);
  const history = compareAprHistory(currentRows, previousRows);

  return {
    monthRef: params.monthRef,
    previousMonthRef,
    sourceType: params.sourceType,
    summary: history.summary,
    details: history.details
  };
};

export const getAprMonthSummaryService = (
  db: Database.Database,
  params: { monthRef: string; historySource: AprSourceType }
) => {
  const manualRows = listAprEntriesByMonth(db, params.monthRef, "manual").map(toParsedAprRow);
  const systemRows = listAprEntriesByMonth(db, params.monthRef, "system").map(toParsedAprRow);
  const audit = compareAprBases(systemRows, manualRows);
  const history = getAprHistoryService(db, {
    monthRef: params.monthRef,
    sourceType: params.historySource
  });

  const uniqueCollaborators = new Set(
    [...manualRows, ...systemRows]
      .map((row) => normalizeComparableText(row.collaborator))
      .filter((value) => value.length > 0)
  ).size;

  return {
    monthRef: params.monthRef,
    previousMonthRef: history.previousMonthRef,
    manualCount: manualRows.length,
    systemCount: systemRows.length,
    uniqueCollaborators,
    statusGeral: buildAprAuditSummary(audit).statusGeral,
    audit: buildAprAuditSummary(audit),
    history: {
      sourceType: params.historySource,
      ...history.summary
    }
  };
};
