import { createHash } from "node:crypto";
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
  listAllAprImportRuns,
  listAprCollaborators,
  listAprEntriesByMonth,
  listAprMonths,
  listAprSnapshots,
  rebuildAprCollaboratorCatalog,
  replaceAprEntriesForMonth,
  replaceAprCollaborators,
  updateAprEntry,
  type AprEntryRecord,
  type AprEntryRow,
  type AprImportRunRow,
  type AprMonthListRow,
  type AprSourceType
} from "./repository";
import type {
  AprAuditFilters,
  AprDestructivePayload,
  AprManualPayload,
  AprSnapshotPayload
} from "./validators";

interface ParsedAprRow {
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

interface AprAuditDetail {
  externalId: string;
  status: "Conferido" | "Só no sistema" | "Só no manual";
  changed: string[];
  system: ParsedAprRow | null;
  manual: ParsedAprRow | null;
}

interface AprHistoryDetail {
  externalId: string;
  status: "Novo" | "Alterado" | "Sem alteração";
  changed: string[];
  current: ParsedAprRow | null;
  previous: ParsedAprRow | null;
}

interface AprSnapshotPayloadRecord {
  scope: "all" | "month";
  monthRef: string | null;
  months: AprMonthListRow[];
  entries: AprEntryRow[];
  importRuns: AprImportRunRow[];
  collaborators: Array<{
    displayName: string;
    normalizedName: string;
    occurrenceCount: number;
  }>;
}

const parseRawPayload = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeWhitespace = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ");

const normalizeComparableText = (value: unknown): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeSubject = (value: string): string => normalizeWhitespace(value).toLocaleUpperCase("pt-BR");
const normalizeCollaborator = (value: string): string => normalizeWhitespace(value);
const monthFromIsoDate = (value: string): string => value.slice(0, 7);
const getPreviousMonth = (monthRef: string): string => {
  const [year, month] = monthRef.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const normalizeEntryInput = (payload: AprManualPayload): AprEntryRecord => ({
  externalId: normalizeWhitespace(payload.externalId),
  openedOn: payload.openedOn,
  subject: normalizeSubject(payload.subject),
  collaborator: normalizeCollaborator(payload.collaborator)
});

const toParsedAprRow = (row: AprEntryRow): ParsedAprRow => ({
  id: row.id,
  monthRef: row.monthRef,
  sourceType: row.sourceType,
  externalId: row.externalId,
  openedOn: row.openedOn,
  subject: row.subject,
  collaborator: row.collaborator,
  rawPayload: parseRawPayload(row.rawPayloadJson),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const buildEntryMap = (rows: ParsedAprRow[]): Map<string, ParsedAprRow> => {
  const map = new Map<string, ParsedAprRow>();
  for (const row of rows) {
    map.set(row.externalId, row);
  }
  return map;
};

const buildSnapshotPayload = (
  db: Database.Database,
  monthRef?: string
): AprSnapshotPayloadRecord => {
  const months = monthRef
    ? listAprMonths(db).filter((item) => item.monthRef === monthRef)
    : listAprMonths(db);
  const entries = monthRef ? listAprEntriesByMonth(db, monthRef) : listAllAprEntries(db);
  const importRuns = monthRef
    ? listAllAprImportRuns(db).filter((item) => months.some((month) => month.id === item.referenceMonthId))
    : listAllAprImportRuns(db);
  const collaborators = listAprCollaborators(db).map((item) => ({
    displayName: item.displayName,
    normalizedName: item.normalizedName,
    occurrenceCount: item.occurrenceCount
  }));

  return {
    scope: monthRef ? "month" : "all",
    monthRef: monthRef ?? null,
    months,
    entries,
    importRuns,
    collaborators
  };
};

const findRestorableSnapshot = (
  db: Database.Database,
  monthRef?: string
) => listAprSnapshots(db, monthRef).find((item) => !item.snapshotReason.startsWith("pre-restore:"));

const checksumPayload = (payloadJson: string): string =>
  createHash("sha256").update(payloadJson).digest("hex");

const restoreSnapshotPayload = (
  db: Database.Database,
  snapshot: AprSnapshotPayloadRecord
): {
  restoredMonths: number;
  restoredEntries: number;
  restoredImportRuns: number;
  restoredCollaborators: number;
} => {
  const write = db.transaction(() => {
    if (snapshot.scope === "month" && snapshot.monthRef) {
      clearAprMonthData(db, snapshot.monthRef);
    } else {
      clearAllAprData(db);
    }

    for (const month of snapshot.months) {
      for (const entry of snapshot.entries.filter((item) => item.monthRef === month.monthRef)) {
        createAprEntry(db, {
          monthRef: month.monthRef,
          sourceType: entry.sourceType,
          createdAt: entry.createdAt,
          entry: {
            externalId: entry.externalId,
            openedOn: entry.openedOn,
            subject: entry.subject,
            collaborator: entry.collaborator,
            rawPayload: entry.rawPayloadJson ? (JSON.parse(entry.rawPayloadJson) as Record<string, unknown>) : undefined
          }
        });
      }

      for (const importRun of snapshot.importRuns.filter(
        (item) => item.referenceMonthId === month.id
      )) {
        createAprImportRun(db, {
          monthRef: month.monthRef,
          sourceType: importRun.sourceType,
          fileName: importRun.fileName ?? undefined,
          importedAt: importRun.importedAt,
          totalValid: importRun.totalValid,
          totalInvalid: importRun.totalInvalid,
          duplicates: importRun.duplicates,
          totalInvalidGlobal: importRun.totalInvalidGlobal,
          duplicatesGlobal: importRun.duplicatesGlobal,
          monthDetectedByDate: Boolean(importRun.monthDetectedByDate),
          metadata: importRun.metadataJson
            ? (JSON.parse(importRun.metadataJson) as Record<string, unknown>)
            : undefined
        });
      }
    }

    if (snapshot.scope === "all") {
      replaceAprCollaborators(
        db,
        snapshot.collaborators.map((item) => ({
          displayName: item.displayName,
          occurrenceCount: item.occurrenceCount
        }))
      );
    } else {
      rebuildAprCollaboratorCatalog(db);
    }

    return {
      restoredMonths: snapshot.months.length,
      restoredEntries: snapshot.entries.length,
      restoredImportRuns: snapshot.importRuns.length,
      restoredCollaborators: listAprCollaborators(db).length
    };
  });

  return write();
};

export const compareAprBases = (systemRows: ParsedAprRow[], manualRows: ParsedAprRow[]) => {
  const systemMap = buildEntryMap(systemRows);
  const manualMap = buildEntryMap(manualRows);
  const externalIds = [...new Set([...systemMap.keys(), ...manualMap.keys()])].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true })
  );

  const summary = {
    totalSistema: systemMap.size,
    totalManual: manualMap.size,
    conferido: 0,
    soSistema: 0,
    soManual: 0,
    totalIds: externalIds.length
  };
  const details: AprAuditDetail[] = [];

  for (const externalId of externalIds) {
    const system = systemMap.get(externalId) ?? null;
    const manual = manualMap.get(externalId) ?? null;
    const changed: string[] = [];
    let status: AprAuditDetail["status"];

    if (system && manual) {
      status = "Conferido";
      summary.conferido++;

      if (system.openedOn !== manual.openedOn) {
        changed.push("Data de abertura");
      }
      if (normalizeComparableText(system.subject) !== normalizeComparableText(manual.subject)) {
        changed.push("Assunto");
      }
      if (
        normalizeComparableText(system.collaborator) !==
        normalizeComparableText(manual.collaborator)
      ) {
        changed.push("Colaborador");
      }
    } else if (system) {
      status = "Só no sistema";
      summary.soSistema++;
    } else {
      status = "Só no manual";
      summary.soManual++;
    }

    details.push({ externalId, status, changed, system, manual });
  }

  return { summary, details };
};

export const compareAprHistory = (currentRows: ParsedAprRow[], previousRows: ParsedAprRow[]) => {
  const currentMap = buildEntryMap(currentRows);
  const previousMap = buildEntryMap(previousRows);
  const externalIds = [...currentMap.keys()].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true })
  );

  const summary = {
    totalAtual: currentMap.size,
    totalAnterior: previousMap.size,
    novo: 0,
    alterado: 0,
    semAlteracao: 0,
    totalIds: externalIds.length
  };
  const details: AprHistoryDetail[] = [];

  for (const externalId of externalIds) {
    const current = currentMap.get(externalId) ?? null;
    const previous = previousMap.get(externalId) ?? null;
    const changed: string[] = [];
    let status: AprHistoryDetail["status"];

    if (!previous) {
      status = "Novo";
      summary.novo++;
    } else {
      if (current?.openedOn !== previous.openedOn) {
        changed.push("Data de abertura");
      }
      if (normalizeComparableText(current?.subject) !== normalizeComparableText(previous.subject)) {
        changed.push("Assunto");
      }
      if (
        normalizeComparableText(current?.collaborator) !==
        normalizeComparableText(previous.collaborator)
      ) {
        changed.push("Colaborador");
      }

      if (changed.length > 0) {
        status = "Alterado";
        summary.alterado++;
      } else {
        status = "Sem alteração";
        summary.semAlteracao++;
      }
    }

    details.push({ externalId, status, changed, current, previous });
  }

  return { summary, details };
};

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
  const targetRows = parsedUpload.grouped.get(parsedUpload.refMonth) ?? parsedUpload.rows;

  replaceAprEntriesForMonth(db, {
    monthRef: parsedUpload.refMonth,
    sourceType: parsedUpload.sourceType,
    entries: targetRows.map((row) => ({
      externalId: row.ID,
      openedOn: row.dataAbertura,
      subject: row.assunto,
      collaborator: row.colaborador,
      rawPayload: {
        ID: row.ID,
        dataAbertura: row.dataAbertura,
        assunto: row.assunto,
        colaborador: row.colaborador
      }
    }))
  });
  rebuildAprCollaboratorCatalog(db);

  createAprImportRun(db, {
    monthRef: parsedUpload.refMonth,
    sourceType: parsedUpload.sourceType,
    fileName: parsedUpload.fileName,
    totalValid: targetRows.length,
    totalInvalid: parsedUpload.invalid.length,
    duplicates: parsedUpload.duplicates.length,
    totalInvalidGlobal: parsedUpload.invalid.length,
    duplicatesGlobal: parsedUpload.duplicates.length,
    monthDetectedByDate: false,
    metadata: {
      importedMonths: [...parsedUpload.grouped.keys()]
    }
  });

  return {
    monthRef: parsedUpload.refMonth,
    sourceType: parsedUpload.sourceType,
    fileName: parsedUpload.fileName,
    totalValid: targetRows.length,
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
