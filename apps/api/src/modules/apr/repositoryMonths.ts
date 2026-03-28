import type Database from "better-sqlite3";
import { nowIso } from "../../db";
import { APR_REFERENCE_MONTH_SELECT, assertMonthRef } from "./repositoryCore";
import type { AprMonthListRow, AprReferenceMonthRow } from "./repositoryTypes";

export const listAprMonths = (db: Database.Database): AprMonthListRow[] =>
  db
    .prepare(
      `
        SELECT
          m.id,
          m.month_ref AS monthRef,
          m.created_at AS createdAt,
          m.updated_at AS updatedAt,
          COALESCE((
            SELECT COUNT(*)
            FROM apr_entries e
            WHERE e.reference_month_id = m.id AND e.source_type = 'manual'
          ), 0) AS manualCount,
          COALESCE((
            SELECT COUNT(*)
            FROM apr_entries e
            WHERE e.reference_month_id = m.id AND e.source_type = 'system'
          ), 0) AS systemCount,
          (
            SELECT MAX(imported_at)
            FROM apr_import_runs r
            WHERE r.reference_month_id = m.id AND r.source_type = 'manual'
          ) AS lastManualImportAt,
          (
            SELECT MAX(imported_at)
            FROM apr_import_runs r
            WHERE r.reference_month_id = m.id AND r.source_type = 'system'
          ) AS lastSystemImportAt
        FROM apr_reference_months m
        ORDER BY m.month_ref ASC
      `
    )
    .all() as AprMonthListRow[];

export const getAprReferenceMonth = (
  db: Database.Database,
  monthRef: string
): AprReferenceMonthRow | undefined => {
  assertMonthRef(monthRef);

  return db
    .prepare(`${APR_REFERENCE_MONTH_SELECT} WHERE month_ref = ?`)
    .get(monthRef) as AprReferenceMonthRow | undefined;
};

export const ensureAprReferenceMonth = (
  db: Database.Database,
  monthRef: string,
  currentTimestamp = nowIso()
): AprReferenceMonthRow => {
  assertMonthRef(monthRef);

  const existing = getAprReferenceMonth(db, monthRef);
  if (existing) {
    return existing;
  }

  db.prepare(
    `
      INSERT INTO apr_reference_months (month_ref, created_at, updated_at)
      VALUES (?, ?, ?)
    `
  ).run(monthRef, currentTimestamp, currentTimestamp);

  return getAprReferenceMonth(db, monthRef) as AprReferenceMonthRow;
};
