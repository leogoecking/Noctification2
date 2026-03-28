import type Database from "better-sqlite3";
import { nowIso } from "../../db";
import { APR_SNAPSHOT_SELECT, assertMonthRef } from "./repositoryCore";
import { ensureAprReferenceMonth } from "./repositoryMonths";
import type { AprSnapshotParams, AprSnapshotRow } from "./repositoryTypes";

export const createAprSnapshot = (
  db: Database.Database,
  params: AprSnapshotParams
): number => {
  const timestamp = params.createdAt ?? nowIso();
  const referenceMonthId = params.monthRef
    ? ensureAprReferenceMonth(db, params.monthRef, timestamp).id
    : null;

  const result = db
    .prepare(
      `
        INSERT INTO apr_snapshots (
          reference_month_id,
          snapshot_reason,
          payload_json,
          checksum,
          created_at
        ) VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(referenceMonthId, params.reason, params.payloadJson, params.checksum, timestamp);

  return Number(result.lastInsertRowid);
};

export const listAprSnapshots = (
  db: Database.Database,
  monthRef?: string
): AprSnapshotRow[] => {
  if (monthRef) {
    assertMonthRef(monthRef);

    return db
      .prepare(
        `
          ${APR_SNAPSHOT_SELECT}
          WHERE reference_month_id = (
            SELECT id FROM apr_reference_months WHERE month_ref = ?
          )
          ORDER BY created_at DESC, id DESC
        `
      )
      .all(monthRef) as AprSnapshotRow[];
  }

  return db
    .prepare(
      `
        ${APR_SNAPSHOT_SELECT}
        ORDER BY created_at DESC, id DESC
      `
    )
    .all() as AprSnapshotRow[];
};

export const findLatestAprSnapshot = (
  db: Database.Database,
  monthRef?: string
): AprSnapshotRow | undefined => listAprSnapshots(db, monthRef)[0];
