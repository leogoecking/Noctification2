import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, nowIso, runMigrations } from "../db";
import {
  createAprImportRun,
  createAprSnapshot,
  ensureAprReferenceMonth,
  listAprCollaborators,
  listAprEntriesByMonth,
  listAprImportRuns,
  listAprSnapshots,
  rebuildAprCollaboratorCatalog,
  replaceAprEntriesForMonth
} from "../modules/apr/repository";

describe("APR migrations and repository isolation", () => {
  let db: ReturnType<typeof connectDatabase>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
  });

  afterEach(() => {
    db.close();
  });

  it("aplica o schema APR em tabelas isoladas sem alterar os modulos atuais", () => {
    const aprMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("018_apr_foundation.sql") as { filename: string } | undefined;

    expect(aprMigration?.filename).toBe("018_apr_foundation.sql");

    const aprTables = [
      "apr_reference_months",
      "apr_entries",
      "apr_import_runs",
      "apr_snapshots",
      "apr_collaborators"
    ].map((tableName) =>
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName) as { name: string } | undefined
    );

    expect(aprTables.map((table) => table?.name)).toEqual([
      "apr_reference_months",
      "apr_entries",
      "apr_import_runs",
      "apr_snapshots",
      "apr_collaborators"
    ]);

    const legacyTables = [
      "users",
      "notifications",
      "reminders",
      "tasks"
    ].map((tableName) =>
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName) as { name: string } | undefined
    );

    expect(legacyTables.map((table) => table?.name)).toEqual([
      "users",
      "notifications",
      "reminders",
      "tasks"
    ]);

    const timestamp = nowIso();
    const referenceMonth = ensureAprReferenceMonth(db, "2026-03", timestamp);

    expect(referenceMonth.monthRef).toBe("2026-03");

    const insertedCount = replaceAprEntriesForMonth(db, {
      monthRef: "2026-03",
      sourceType: "manual",
      updatedAt: timestamp,
      entries: [
        {
          externalId: "APR-001",
          openedOn: "2026-03-02",
          subject: "MAPEAMENTO",
          collaborator: "FELIPE",
          rawPayload: { source: "manual-test" }
        },
        {
          externalId: "APR-002",
          openedOn: "2026-03-03",
          subject: "PODAS",
          collaborator: "RENAN"
        }
      ]
    });

    expect(insertedCount).toBe(2);

    const importRunId = createAprImportRun(db, {
      monthRef: "2026-03",
      sourceType: "manual",
      fileName: "apr-manual.csv",
      importedAt: timestamp,
      totalValid: 2,
      totalInvalid: 1,
      duplicates: 0,
      metadata: { operator: "test-suite" }
    });

    const snapshotId = createAprSnapshot(db, {
      monthRef: "2026-03",
      reason: "initial-import",
      payloadJson: JSON.stringify({ monthRef: "2026-03", totalEntries: 2 }),
      checksum: "abc12345",
      createdAt: timestamp
    });

    expect(importRunId).toBeGreaterThan(0);
    expect(snapshotId).toBeGreaterThan(0);

    const entries = listAprEntriesByMonth(db, "2026-03", "manual");
    const importRuns = listAprImportRuns(db, "2026-03");
    const snapshots = listAprSnapshots(db, "2026-03");
    rebuildAprCollaboratorCatalog(db, timestamp);
    const collaborators = listAprCollaborators(db);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      externalId: "APR-001",
      sourceType: "manual",
      subject: "MAPEAMENTO"
    });
    expect(importRuns[0]).toMatchObject({
      sourceType: "manual",
      fileName: "apr-manual.csv",
      totalValid: 2,
      totalInvalid: 1
    });
    expect(snapshots[0]).toMatchObject({
      snapshotReason: "initial-import",
      checksum: "abc12345"
    });
    expect(collaborators).toHaveLength(2);
    expect(collaborators[0]).toMatchObject({
      displayName: "FELIPE"
    });

    const legacyCounts = {
      notifications: (db.prepare("SELECT COUNT(*) AS count FROM notifications").get() as { count: number })
        .count,
      reminders: (db.prepare("SELECT COUNT(*) AS count FROM reminders").get() as { count: number }).count,
      tasks: (db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count
    };

    expect(legacyCounts).toEqual({
      notifications: 0,
      reminders: 0,
      tasks: 0
    });
  });
});
