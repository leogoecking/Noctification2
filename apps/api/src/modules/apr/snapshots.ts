import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  clearAllAprData,
  clearAprMonthData,
  createAprEntry,
  createAprImportRun,
  listAllAprEntries,
  listAllAprImportRuns,
  listAprCollaborators,
  listAprEntriesByMonth,
  listAprMonths,
  listAprSnapshots,
  rebuildAprCollaboratorCatalog,
  replaceAprCollaborators
} from "./repository";
import type { AprSnapshotPayloadRecord } from "./model";

export const buildSnapshotPayload = (
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

export const findRestorableSnapshot = (db: Database.Database, monthRef?: string) =>
  listAprSnapshots(db, monthRef).find((item) => !item.snapshotReason.startsWith("pre-restore:"));

export const checksumPayload = (payloadJson: string): string =>
  createHash("sha256").update(payloadJson).digest("hex");

export const restoreSnapshotPayload = (
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
