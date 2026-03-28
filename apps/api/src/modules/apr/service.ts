import type Database from "better-sqlite3";
import type { ParsedAprUpload } from "./import";
import {
  clearAllAprData,
  clearAprMonthData,
  createAprEntry,
  createAprImportRun,
  createAprSnapshot,
  deleteAprEntry,
  fetchAprEntryById,
  findAprEntryByExternalId,
  listAllAprEntries,
  listAprCollaborators,
  listAprEntriesByMonth,
  listAprMonths,
  listAprSnapshots,
  listAprSubjects,
  rebuildAprCollaboratorCatalog,
  replaceAprEntriesForMonth,
  updateAprEntry,
  type AprMonthListRow,
  type AprSourceType
} from "./repository";
import {
  compareAprBases,
  compareAprHistory
} from "./compare";
import {
  getPreviousMonth,
  monthFromIsoDate,
  normalizeComparableText,
  normalizeEntryInput,
  normalizeExternalId,
  type AprSnapshotPayloadRecord,
  toParsedAprRow
} from "./model";
import {
  buildSnapshotPayload,
  checksumPayload,
  findRestorableSnapshot,
  restoreSnapshotPayload
} from "./snapshots";
import type {
  AprAuditFilters,
  AprDestructivePayload,
  AprManualPayload,
  AprSnapshotPayload
} from "./validators";

export { compareAprBases, compareAprHistory } from "./compare";

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
  let details = audit.details.slice();

  if (params.filters.mode === "missing") {
    details = details.filter((item) => item.status !== "Conferido");
  }

  const search = normalizeComparableText(params.filters.search);
  const collaborator = normalizeComparableText(params.filters.collaborator);
  const subject = normalizeComparableText(params.filters.subject);
  const date = params.filters.date ?? "";

  if (search) {
    details = details.filter((item) =>
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
    details = details.filter((item) =>
      [item.system?.collaborator, item.manual?.collaborator].some((value) =>
        normalizeComparableText(value).includes(collaborator)
      )
    );
  }

  if (subject) {
    details = details.filter((item) =>
      [item.system?.subject, item.manual?.subject].some((value) =>
        normalizeComparableText(value).includes(subject)
      )
    );
  }

  if (date) {
    details = details.filter((item) =>
      [item.system?.openedOn, item.manual?.openedOn].some((value) => value === date)
    );
  }

  return {
    monthRef: params.monthRef,
    summary: {
      ...audit.summary,
      statusGeral: audit.summary.soSistema || audit.summary.soManual ? "Divergente" : "Conferido",
      divergentes: audit.summary.soSistema + audit.summary.soManual
    },
    details
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
    statusGeral: audit.summary.soSistema || audit.summary.soManual ? "Divergente" : "Conferido",
    audit: {
      ...audit.summary,
      divergentes: audit.summary.soSistema + audit.summary.soManual
    },
    history: {
      sourceType: params.historySource,
      ...history.summary
    }
  };
};

export const createAprManualEntryService = (
  db: Database.Database,
  params: { requestedMonthRef: string; payload: AprManualPayload }
) => {
  const entry = normalizeEntryInput(params.payload);
  const targetMonthRef = monthFromIsoDate(entry.openedOn);
  const conflict = findAprEntryByExternalId(db, {
    monthRef: targetMonthRef,
    sourceType: "manual",
    externalId: entry.externalId
  });

  if (conflict) {
    return { error: "Ja existe um lancamento manual com esse external_id", status: 409 as const };
  }

  const created = createAprEntry(db, {
    monthRef: targetMonthRef,
    sourceType: "manual",
    entry
  });
  rebuildAprCollaboratorCatalog(db);

  return {
    row: toParsedAprRow(created),
    savedMonthRef: targetMonthRef,
    moved: targetMonthRef !== params.requestedMonthRef
  };
};

export const updateAprManualEntryService = (
  db: Database.Database,
  params: { requestedMonthRef: string; entryId: number; payload: AprManualPayload }
) => {
  const existing = fetchAprEntryById(db, params.entryId);
  if (!existing || existing.sourceType !== "manual" || existing.monthRef !== params.requestedMonthRef) {
    return { error: "Lancamento manual nao encontrado", status: 404 as const };
  }

  const entry = normalizeEntryInput(params.payload);
  const targetMonthRef = monthFromIsoDate(entry.openedOn);
  const conflict = findAprEntryByExternalId(db, {
    monthRef: targetMonthRef,
    sourceType: "manual",
    externalId: entry.externalId,
    excludeEntryId: params.entryId
  });

  if (conflict) {
    return { error: "Ja existe um lancamento manual com esse external_id", status: 409 as const };
  }

  const updated = updateAprEntry(db, {
    entryId: params.entryId,
    monthRef: targetMonthRef,
    sourceType: "manual",
    entry
  });

  if (!updated) {
    return { error: "Lancamento manual nao encontrado", status: 404 as const };
  }

  rebuildAprCollaboratorCatalog(db);

  return {
    row: toParsedAprRow(updated),
    savedMonthRef: targetMonthRef,
    moved: targetMonthRef !== params.requestedMonthRef
  };
};

export const deleteAprManualEntryService = (
  db: Database.Database,
  params: { requestedMonthRef: string; entryId: number }
) => {
  const existing = fetchAprEntryById(db, params.entryId);
  if (!existing || existing.sourceType !== "manual" || existing.monthRef !== params.requestedMonthRef) {
    return { error: "Lancamento manual nao encontrado", status: 404 as const };
  }

  const deleted = deleteAprEntry(db, params.entryId);
  if (!deleted) {
    return { error: "Lancamento manual nao encontrado", status: 404 as const };
  }

  rebuildAprCollaboratorCatalog(db);

  return {
    ok: true,
    deletedId: params.entryId,
    monthRef: params.requestedMonthRef
  };
};

export const importAprRowsService = (
  db: Database.Database,
  parsedUpload: ParsedAprUpload
) => {
  const importedMonths = [...parsedUpload.grouped.keys()].sort((left, right) =>
    left.localeCompare(right)
  );
  if (!importedMonths.length) {
    throw new Error("Nenhum registro disponivel para importacao");
  }

  for (const monthRef of importedMonths) {
    const targetRows = parsedUpload.grouped.get(monthRef) ?? [];
    if (!targetRows.length) {
      continue;
    }

    replaceAprEntriesForMonth(db, {
      monthRef,
      sourceType: parsedUpload.sourceType,
      entries: targetRows.map((row) => ({
        externalId: normalizeExternalId(row.ID),
        openedOn: row.dataAbertura,
        subject: row.assunto,
        collaborator: row.colaborador,
        rawPayload: {
          ID: normalizeExternalId(row.ID),
          dataAbertura: row.dataAbertura,
          assunto: row.assunto,
          colaborador: row.colaborador
        }
      }))
    });

    createAprImportRun(db, {
      monthRef,
      sourceType: parsedUpload.sourceType,
      fileName: parsedUpload.fileName,
      totalValid: targetRows.length,
      totalInvalid: parsedUpload.invalid.length,
      duplicates: parsedUpload.duplicates.length,
      totalInvalidGlobal: parsedUpload.invalid.length,
      duplicatesGlobal: parsedUpload.duplicates.length,
      monthDetectedByDate: monthRef !== parsedUpload.refMonth,
      metadata: {
        requestedMonthRef: parsedUpload.refMonth,
        importedMonths
      }
    });
  }
  rebuildAprCollaboratorCatalog(db);
  const primaryMonthRef = importedMonths.includes(parsedUpload.refMonth)
    ? parsedUpload.refMonth
    : importedMonths[importedMonths.length - 1];
  const totalValid = importedMonths.reduce(
    (count, monthRef) => count + (parsedUpload.grouped.get(monthRef)?.length ?? 0),
    0
  );

  return {
    monthRef: primaryMonthRef,
    requestedMonthRef: parsedUpload.refMonth,
    importedMonths,
    monthDetectedByDate: importedMonths.some((monthRef) => monthRef !== parsedUpload.refMonth),
    sourceType: parsedUpload.sourceType,
    fileName: parsedUpload.fileName,
    totalValid,
    totalInvalid: parsedUpload.invalid.length,
    duplicates: parsedUpload.duplicates,
    invalid: parsedUpload.invalid
  };
};

export const createAprSnapshotService = (
  db: Database.Database,
  params: { monthRef?: string; payload: AprSnapshotPayload }
) => {
  rebuildAprCollaboratorCatalog(db);
  const snapshotPayload = buildSnapshotPayload(db, params.monthRef);
  const payloadJson = JSON.stringify({
    ...snapshotPayload,
    requestedReason: params.payload.reason
  });
  const snapshotId = createAprSnapshot(db, {
    monthRef: params.monthRef,
    reason: params.payload.reason,
    payloadJson,
    checksum: checksumPayload(payloadJson)
  });

  return {
    snapshotId,
    scope: snapshotPayload.scope,
    monthRef: snapshotPayload.monthRef,
    reason: params.payload.reason
  };
};

export const listAprSnapshotsService = (db: Database.Database, params: { monthRef?: string }) => ({
  snapshots: listAprSnapshots(db, params.monthRef)
});

export const restoreLatestAprSnapshotService = (
  db: Database.Database,
  params: { monthRef?: string; payload: AprDestructivePayload }
) => {
  const latestSnapshot = findRestorableSnapshot(db, params.monthRef);
  if (!latestSnapshot) {
    return { error: "Nenhum snapshot APR disponivel para restauracao", status: 404 as const };
  }

  const beforeRestorePayload = buildSnapshotPayload(db, params.monthRef);
  const beforeRestoreJson = JSON.stringify({
    ...beforeRestorePayload,
    requestedReason: `pre-restore:${params.payload.reason}`
  });
  createAprSnapshot(db, {
    monthRef: params.monthRef,
    reason: `pre-restore:${params.payload.reason}`,
    payloadJson: beforeRestoreJson,
    checksum: checksumPayload(beforeRestoreJson)
  });

  const parsedSnapshot = JSON.parse(latestSnapshot.payloadJson) as AprSnapshotPayloadRecord;
  const restored = restoreSnapshotPayload(db, parsedSnapshot);

  return {
    ok: true,
    restoredFromSnapshotId: latestSnapshot.id,
    scope: parsedSnapshot.scope,
    monthRef: parsedSnapshot.monthRef,
    ...restored
  };
};

export const clearAprMonthService = (
  db: Database.Database,
  params: { monthRef: string; payload: AprDestructivePayload }
) => {
  const snapshotPayload = buildSnapshotPayload(db, params.monthRef);
  const payloadJson = JSON.stringify({
    ...snapshotPayload,
    requestedReason: `pre-clear-month:${params.payload.reason}`
  });
  const snapshotId = createAprSnapshot(db, {
    monthRef: params.monthRef,
    reason: `pre-clear-month:${params.payload.reason}`,
    payloadJson,
    checksum: checksumPayload(payloadJson)
  });

  const cleared = clearAprMonthData(db, params.monthRef);

  return {
    ok: true,
    monthRef: params.monthRef,
    safeguardSnapshotId: snapshotId,
    ...cleared
  };
};

export const clearAllAprService = (
  db: Database.Database,
  params: { payload: AprDestructivePayload }
) => {
  const snapshotPayload = buildSnapshotPayload(db);
  const payloadJson = JSON.stringify({
    ...snapshotPayload,
    requestedReason: `pre-clear-all:${params.payload.reason}`
  });
  const snapshotId = createAprSnapshot(db, {
    reason: `pre-clear-all:${params.payload.reason}`,
    payloadJson,
    checksum: checksumPayload(payloadJson)
  });

  const cleared = clearAllAprData(db);

  return {
    ok: true,
    safeguardSnapshotId: snapshotId,
    ...cleared
  };
};
