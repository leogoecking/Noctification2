import type Database from "better-sqlite3";
import type { ParsedAprUpload } from "./import";
import {
  createAprEntry,
  createAprImportRun,
  deleteAprEntry,
  fetchAprEntryById,
  findAprEntryByExternalId,
  rebuildAprCollaboratorCatalog,
  replaceAprEntriesForMonth,
  updateAprEntry
} from "./repository";
import {
  monthFromIsoDate,
  normalizeEntryInput,
  normalizeExternalId,
  toParsedAprRow
} from "./model";
import type { AprManualPayload } from "./validators";

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

    const monthInvalidTotal = parsedUpload.invalidByMonth.get(monthRef) ?? 0;
    const monthDuplicateTotal = parsedUpload.duplicatesByMonth.get(monthRef)?.size ?? 0;

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
      totalInvalid: monthInvalidTotal,
      duplicates: monthDuplicateTotal,
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
