import type Database from "better-sqlite3";
import { nowIso, sanitizeMetadata } from "../../db";
import { APR_IMPORT_RUN_SELECT, assertMonthRef, touchReferenceMonth } from "./repositoryCore";
import { ensureAprReferenceMonth } from "./repositoryMonths";
import type { AprImportRunParams, AprImportRunRow } from "./repositoryTypes";

export const createAprImportRun = (
  db: Database.Database,
  params: AprImportRunParams
): number => {
  const timestamp = params.importedAt ?? nowIso();
  const referenceMonth = ensureAprReferenceMonth(db, params.monthRef, timestamp);

  const result = db
    .prepare(
      `
        INSERT INTO apr_import_runs (
          reference_month_id,
          source_type,
          file_name,
          imported_at,
          total_valid,
          total_invalid,
          duplicates,
          total_invalid_global,
          duplicates_global,
          month_detected_by_date,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      referenceMonth.id,
      params.sourceType,
      params.fileName ?? null,
      timestamp,
      params.totalValid,
      params.totalInvalid ?? 0,
      params.duplicates ?? 0,
      params.totalInvalidGlobal ?? params.totalInvalid ?? 0,
      params.duplicatesGlobal ?? params.duplicates ?? 0,
      params.monthDetectedByDate ? 1 : 0,
      sanitizeMetadata(params.metadata)
    );

  touchReferenceMonth(db, referenceMonth.id, timestamp);
  return Number(result.lastInsertRowid);
};

export const listAprImportRuns = (db: Database.Database, monthRef: string): AprImportRunRow[] => {
  assertMonthRef(monthRef);

  return db
    .prepare(
      `
        ${APR_IMPORT_RUN_SELECT}
        WHERE reference_month_id = (
          SELECT id FROM apr_reference_months WHERE month_ref = ?
        )
        ORDER BY imported_at DESC, id DESC
      `
    )
    .all(monthRef) as AprImportRunRow[];
};

export const listAllAprImportRuns = (db: Database.Database): AprImportRunRow[] =>
  db
    .prepare(
      `
        ${APR_IMPORT_RUN_SELECT}
        ORDER BY imported_at DESC, id DESC
      `
    )
    .all() as AprImportRunRow[];
