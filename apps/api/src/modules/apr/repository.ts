import type Database from "better-sqlite3";
import { nowIso, sanitizeMetadata } from "../../db";

export type AprSourceType = "manual" | "system";

export interface AprReferenceMonthRow {
  id: number;
  monthRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface AprMonthListRow extends AprReferenceMonthRow {
  manualCount: number;
  systemCount: number;
  lastManualImportAt: string | null;
  lastSystemImportAt: string | null;
}

export interface AprEntryRecord {
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayload?: Record<string, unknown>;
}

export interface AprEntryRow {
  id: number;
  referenceMonthId: number;
  monthRef: string;
  sourceType: AprSourceType;
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayloadJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AprImportRunParams {
  monthRef: string;
  sourceType: AprSourceType;
  fileName?: string;
  importedAt?: string;
  totalValid: number;
  totalInvalid?: number;
  duplicates?: number;
  totalInvalidGlobal?: number;
  duplicatesGlobal?: number;
  monthDetectedByDate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AprImportRunRow {
  id: number;
  referenceMonthId: number;
  sourceType: AprSourceType;
  fileName: string | null;
  importedAt: string;
  totalValid: number;
  totalInvalid: number;
  duplicates: number;
  totalInvalidGlobal: number;
  duplicatesGlobal: number;
  monthDetectedByDate: number;
  metadataJson: string | null;
}

export interface AprSnapshotParams {
  monthRef?: string;
  reason: string;
  payloadJson: string;
  checksum: string;
  createdAt?: string;
}

export interface AprSnapshotRow {
  id: number;
  referenceMonthId: number | null;
  snapshotReason: string;
  payloadJson: string;
  checksum: string;
  createdAt: string;
}

export interface AprCollaboratorRow {
  id: number;
  displayName: string;
  normalizedName: string;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AprSubjectCatalogRow {
  subject: string;
  occurrenceCount: number;
}

const APR_REFERENCE_MONTH_SELECT = `
  SELECT
    id,
    month_ref AS monthRef,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM apr_reference_months
`;

const APR_ENTRY_SELECT = `
  SELECT
    e.id,
    e.reference_month_id AS referenceMonthId,
    m.month_ref AS monthRef,
    e.source_type AS sourceType,
    e.external_id AS externalId,
    e.opened_on AS openedOn,
    e.subject,
    e.collaborator,
    e.raw_payload_json AS rawPayloadJson,
    e.created_at AS createdAt,
    e.updated_at AS updatedAt
  FROM apr_entries e
  INNER JOIN apr_reference_months m ON m.id = e.reference_month_id
`;

const APR_IMPORT_RUN_SELECT = `
  SELECT
    id,
    reference_month_id AS referenceMonthId,
    source_type AS sourceType,
    file_name AS fileName,
    imported_at AS importedAt,
    total_valid AS totalValid,
    total_invalid AS totalInvalid,
    duplicates,
    total_invalid_global AS totalInvalidGlobal,
    duplicates_global AS duplicatesGlobal,
    month_detected_by_date AS monthDetectedByDate,
    metadata_json AS metadataJson
  FROM apr_import_runs
`;

const APR_SNAPSHOT_SELECT = `
  SELECT
    id,
    reference_month_id AS referenceMonthId,
    snapshot_reason AS snapshotReason,
    payload_json AS payloadJson,
    checksum,
    created_at AS createdAt
  FROM apr_snapshots
`;

const APR_COLLABORATOR_SELECT = `
  SELECT
    id,
    display_name AS displayName,
    normalized_name AS normalizedName,
    occurrence_count AS occurrenceCount,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM apr_collaborators
`;

const assertMonthRef = (monthRef: string): void => {
  if (!/^\d{4}-\d{2}$/.test(monthRef)) {
    throw new Error("APR month_ref invalido. Use o formato YYYY-MM.");
  }
};

const normalizeCatalogName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toCatalogDisplayName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("pt-BR");

const touchReferenceMonth = (
  db: Database.Database,
  referenceMonthId: number,
  updatedAt = nowIso()
): void => {
  db.prepare(
    `
      UPDATE apr_reference_months
      SET updated_at = ?
      WHERE id = ?
    `
  ).run(updatedAt, referenceMonthId);
};

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

export const listAprCollaborators = (
  db: Database.Database,
  search?: string
): AprCollaboratorRow[] => {
  const normalizedSearch = search?.trim().toLowerCase() ?? "";

  if (!normalizedSearch) {
    return db
      .prepare(
        `
          ${APR_COLLABORATOR_SELECT}
          ORDER BY display_name ASC, id ASC
        `
      )
      .all() as AprCollaboratorRow[];
  }

  return db
    .prepare(
      `
        ${APR_COLLABORATOR_SELECT}
        WHERE LOWER(display_name) LIKE ?
           OR normalized_name LIKE ?
        ORDER BY display_name ASC, id ASC
      `
    )
    .all(`%${normalizedSearch}%`, `%${normalizeCatalogName(normalizedSearch)}%`) as AprCollaboratorRow[];
};

export const listAprSubjects = (
  db: Database.Database,
  search?: string
): AprSubjectCatalogRow[] => {
  const normalizedSearch = search?.trim().toUpperCase() ?? "";

  if (!normalizedSearch) {
    return db
      .prepare(
        `
          SELECT
            subject,
            COUNT(*) AS occurrenceCount
          FROM apr_entries
          GROUP BY subject
          ORDER BY occurrenceCount DESC, subject ASC
        `
      )
      .all() as AprSubjectCatalogRow[];
  }

  return db
    .prepare(
      `
        SELECT
          subject,
          COUNT(*) AS occurrenceCount
        FROM apr_entries
        WHERE UPPER(subject) LIKE ?
        GROUP BY subject
        ORDER BY occurrenceCount DESC, subject ASC
      `
    )
    .all(`%${normalizedSearch}%`) as AprSubjectCatalogRow[];
};

export const replaceAprCollaborators = (
  db: Database.Database,
  rows: Array<{ displayName: string; occurrenceCount: number }>,
  updatedAt = nowIso()
): number => {
  const write = db.transaction(() => {
    db.prepare("DELETE FROM apr_collaborators").run();

    const insert = db.prepare(
      `
        INSERT INTO apr_collaborators (
          display_name,
          normalized_name,
          occurrence_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `
    );

    for (const row of rows) {
      insert.run(
        toCatalogDisplayName(row.displayName),
        normalizeCatalogName(row.displayName),
        row.occurrenceCount,
        updatedAt,
        updatedAt
      );
    }

    return rows.length;
  });

  return write();
};

export const rebuildAprCollaboratorCatalog = (
  db: Database.Database,
  updatedAt = nowIso()
): number => {
  const counts = new Map<string, { displayName: string; occurrenceCount: number }>();

  for (const row of listAllAprEntries(db)) {
    const normalized = normalizeCatalogName(row.collaborator);
    if (!normalized) {
      continue;
    }

    const existing = counts.get(normalized);
    if (existing) {
      existing.occurrenceCount += 1;
      if (row.collaborator.localeCompare(existing.displayName, "pt-BR") < 0) {
        existing.displayName = row.collaborator;
      }
      continue;
    }

    counts.set(normalized, {
      displayName: toCatalogDisplayName(row.collaborator),
      occurrenceCount: 1
    });
  }

  return replaceAprCollaborators(db, [...counts.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR")), updatedAt);
};

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
