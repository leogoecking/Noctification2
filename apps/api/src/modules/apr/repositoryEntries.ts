import type Database from "better-sqlite3";
import { nowIso, sanitizeMetadata } from "../../db";
import { APR_ENTRY_SELECT, assertMonthRef, touchReferenceMonth } from "./repositoryCore";
import { ensureAprReferenceMonth } from "./repositoryMonths";
import type { AprEntryRecord, AprEntryRow, AprSourceType } from "./repositoryTypes";

export const fetchAprEntryById = (
  db: Database.Database,
  entryId: number
): AprEntryRow | undefined =>
  db.prepare(`${APR_ENTRY_SELECT} WHERE e.id = ?`).get(entryId) as AprEntryRow | undefined;

export const findAprEntryByExternalId = (
  db: Database.Database,
  params: {
    monthRef: string;
    sourceType: AprSourceType;
    externalId: string;
    excludeEntryId?: number;
  }
): AprEntryRow | undefined => {
  assertMonthRef(params.monthRef);

  if (params.excludeEntryId) {
    return db
      .prepare(
        `
          ${APR_ENTRY_SELECT}
          WHERE m.month_ref = ?
            AND e.source_type = ?
            AND e.external_id = ?
            AND e.id <> ?
        `
      )
      .get(
        params.monthRef,
        params.sourceType,
        params.externalId,
        params.excludeEntryId
      ) as AprEntryRow | undefined;
  }

  return db
    .prepare(
      `
        ${APR_ENTRY_SELECT}
        WHERE m.month_ref = ?
          AND e.source_type = ?
          AND e.external_id = ?
      `
    )
    .get(params.monthRef, params.sourceType, params.externalId) as AprEntryRow | undefined;
};

export const createAprEntry = (
  db: Database.Database,
  params: {
    monthRef: string;
    sourceType: AprSourceType;
    entry: AprEntryRecord;
    createdAt?: string;
  }
): AprEntryRow => {
  const timestamp = params.createdAt ?? nowIso();
  const write = db.transaction(() => {
    const referenceMonth = ensureAprReferenceMonth(db, params.monthRef, timestamp);
    const result = db
      .prepare(
        `
          INSERT INTO apr_entries (
            reference_month_id,
            source_type,
            external_id,
            opened_on,
            subject,
            collaborator,
            raw_payload_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        referenceMonth.id,
        params.sourceType,
        params.entry.externalId,
        params.entry.openedOn,
        params.entry.subject,
        params.entry.collaborator,
        sanitizeMetadata(params.entry.rawPayload),
        timestamp,
        timestamp
      );

    touchReferenceMonth(db, referenceMonth.id, timestamp);
    return fetchAprEntryById(db, Number(result.lastInsertRowid)) as AprEntryRow;
  });

  return write();
};

export const updateAprEntry = (
  db: Database.Database,
  params: {
    entryId: number;
    monthRef: string;
    sourceType: AprSourceType;
    entry: AprEntryRecord;
    updatedAt?: string;
  }
): AprEntryRow | undefined => {
  const timestamp = params.updatedAt ?? nowIso();
  const write = db.transaction(() => {
    const existing = fetchAprEntryById(db, params.entryId);
    if (!existing) {
      return undefined;
    }

    const nextReferenceMonth = ensureAprReferenceMonth(db, params.monthRef, timestamp);
    db.prepare(
      `
        UPDATE apr_entries
        SET
          reference_month_id = ?,
          source_type = ?,
          external_id = ?,
          opened_on = ?,
          subject = ?,
          collaborator = ?,
          raw_payload_json = ?,
          updated_at = ?
        WHERE id = ?
      `
    ).run(
      nextReferenceMonth.id,
      params.sourceType,
      params.entry.externalId,
      params.entry.openedOn,
      params.entry.subject,
      params.entry.collaborator,
      sanitizeMetadata(params.entry.rawPayload),
      timestamp,
      params.entryId
    );

    touchReferenceMonth(db, existing.referenceMonthId, timestamp);
    touchReferenceMonth(db, nextReferenceMonth.id, timestamp);
    return fetchAprEntryById(db, params.entryId);
  });

  return write();
};

export const deleteAprEntry = (
  db: Database.Database,
  entryId: number,
  deletedAt = nowIso()
): boolean => {
  const write = db.transaction(() => {
    const existing = fetchAprEntryById(db, entryId);
    if (!existing) {
      return false;
    }

    const result = db.prepare("DELETE FROM apr_entries WHERE id = ?").run(entryId);
    touchReferenceMonth(db, existing.referenceMonthId, deletedAt);
    return result.changes > 0;
  });

  return write();
};

export const replaceAprEntriesForMonth = (
  db: Database.Database,
  params: {
    monthRef: string;
    sourceType: AprSourceType;
    entries: AprEntryRecord[];
    updatedAt?: string;
  }
): number => {
  const timestamp = params.updatedAt ?? nowIso();
  const write = db.transaction(() => {
    const referenceMonth = ensureAprReferenceMonth(db, params.monthRef, timestamp);

    db.prepare(
      `
        DELETE FROM apr_entries
        WHERE reference_month_id = ? AND source_type = ?
      `
    ).run(referenceMonth.id, params.sourceType);

    const insertEntry = db.prepare(
      `
        INSERT INTO apr_entries (
          reference_month_id,
          source_type,
          external_id,
          opened_on,
          subject,
          collaborator,
          raw_payload_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const entry of params.entries) {
      insertEntry.run(
        referenceMonth.id,
        params.sourceType,
        entry.externalId,
        entry.openedOn,
        entry.subject,
        entry.collaborator,
        sanitizeMetadata(entry.rawPayload),
        timestamp,
        timestamp
      );
    }

    touchReferenceMonth(db, referenceMonth.id, timestamp);
    return params.entries.length;
  });

  return write();
};

export const listAprEntriesByMonth = (
  db: Database.Database,
  monthRef: string,
  sourceType?: AprSourceType
): AprEntryRow[] => {
  assertMonthRef(monthRef);

  if (sourceType) {
    return db
      .prepare(
        `
          ${APR_ENTRY_SELECT}
          WHERE m.month_ref = ?
            AND e.source_type = ?
          ORDER BY e.opened_on ASC, e.external_id ASC
        `
      )
      .all(monthRef, sourceType) as AprEntryRow[];
  }

  return db
    .prepare(
      `
        ${APR_ENTRY_SELECT}
        WHERE m.month_ref = ?
        ORDER BY e.source_type ASC, e.opened_on ASC, e.external_id ASC
      `
    )
    .all(monthRef) as AprEntryRow[];
};

export const listAllAprEntries = (db: Database.Database): AprEntryRow[] =>
  db
    .prepare(
      `
        ${APR_ENTRY_SELECT}
        ORDER BY m.month_ref ASC, e.source_type ASC, e.opened_on ASC, e.external_id ASC
      `
    )
    .all() as AprEntryRow[];
