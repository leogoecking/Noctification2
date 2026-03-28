import type Database from "better-sqlite3";
import { nowIso } from "../../db";
import {
  APR_COLLABORATOR_SELECT,
  normalizeCatalogName,
  toCatalogDisplayName
} from "./repositoryCore";
import { listAllAprEntries } from "./repositoryEntries";
import type { AprCollaboratorRow, AprSubjectCatalogRow } from "./repositoryTypes";

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

  return replaceAprCollaborators(
    db,
    [...counts.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR")),
    updatedAt
  );
};
