import type Database from "better-sqlite3";
import { nowIso } from "../../db";
import { touchReferenceMonth, assertMonthRef } from "./repositoryCore";
import { rebuildAprCollaboratorCatalog } from "./repositoryCatalog";
import { getAprReferenceMonth } from "./repositoryMonths";

export const clearAprMonthData = (
  db: Database.Database,
  monthRef: string,
  clearedAt = nowIso()
): { removedEntries: number; removedImportRuns: number } => {
  assertMonthRef(monthRef);

  const write = db.transaction(() => {
    const month = getAprReferenceMonth(db, monthRef);
    if (!month) {
      return { removedEntries: 0, removedImportRuns: 0 };
    }

    const removedEntries = db
      .prepare("DELETE FROM apr_entries WHERE reference_month_id = ?")
      .run(month.id).changes;
    const removedImportRuns = db
      .prepare("DELETE FROM apr_import_runs WHERE reference_month_id = ?")
      .run(month.id).changes;

    touchReferenceMonth(db, month.id, clearedAt);
    rebuildAprCollaboratorCatalog(db, clearedAt);

    return {
      removedEntries,
      removedImportRuns
    };
  });

  return write();
};

export const clearAllAprData = (
  db: Database.Database
): {
  removedEntries: number;
  removedImportRuns: number;
  removedMonths: number;
  removedCollaborators: number;
} => {
  const write = db.transaction(() => {
    const removedEntries = db.prepare("DELETE FROM apr_entries").run().changes;
    const removedImportRuns = db.prepare("DELETE FROM apr_import_runs").run().changes;
    const removedCollaborators = db.prepare("DELETE FROM apr_collaborators").run().changes;
    const removedMonths = db.prepare("DELETE FROM apr_reference_months").run().changes;

    return {
      removedEntries,
      removedImportRuns,
      removedMonths,
      removedCollaborators
    };
  });

  return write();
};
