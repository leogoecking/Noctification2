import type Database from "better-sqlite3";
import { nowIso } from "../../db";

export const APR_REFERENCE_MONTH_SELECT = `
  SELECT
    id,
    month_ref AS monthRef,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM apr_reference_months
`;

export const APR_ENTRY_SELECT = `
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

export const APR_IMPORT_RUN_SELECT = `
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

export const APR_SNAPSHOT_SELECT = `
  SELECT
    id,
    reference_month_id AS referenceMonthId,
    snapshot_reason AS snapshotReason,
    payload_json AS payloadJson,
    checksum,
    created_at AS createdAt
  FROM apr_snapshots
`;

export const APR_COLLABORATOR_SELECT = `
  SELECT
    id,
    display_name AS displayName,
    normalized_name AS normalizedName,
    occurrence_count AS occurrenceCount,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM apr_collaborators
`;

export const assertMonthRef = (monthRef: string): void => {
  if (!/^\d{4}-\d{2}$/.test(monthRef)) {
    throw new Error("APR month_ref invalido. Use o formato YYYY-MM.");
  }
};

export const normalizeCatalogName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const toCatalogDisplayName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("pt-BR");

export const touchReferenceMonth = (
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
