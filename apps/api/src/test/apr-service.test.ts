import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, runMigrations } from "../db";
import { createAprEntry } from "../modules/apr/repository";
import {
  clearAllAprService,
  clearAprMonthService,
  compareAprBases,
  compareAprHistory,
  createAprManualEntryService,
  createAprSnapshotService,
  getAprAuditService,
  listAprCollaboratorsService,
  getAprHistoryService,
  getAprMonthSummaryService,
  getAprRowsService,
  listAprMonthsService,
  listAprSnapshotsService,
  restoreLatestAprSnapshotService,
  updateAprManualEntryService
} from "../modules/apr/service";

describe("APR service", () => {
  let db: ReturnType<typeof connectDatabase>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
  });

  afterEach(() => {
    db.close();
  });

  it("summarizes months, rows, audit and history from isolated APR tables", () => {
    createAprEntry(db, {
      monthRef: "2026-03",
      sourceType: "manual",
      entry: {
        externalId: "APR-001",
        openedOn: "2026-03-02",
        subject: "MAPEAMENTO",
        collaborator: "Felipe"
      }
    });
    createAprEntry(db, {
      monthRef: "2026-03",
      sourceType: "system",
      entry: {
        externalId: "APR-001",
        openedOn: "2026-03-02",
        subject: "Mapeamento",
        collaborator: "Felipe"
      }
    });
    createAprEntry(db, {
      monthRef: "2026-03",
      sourceType: "system",
      entry: {
        externalId: "APR-002",
        openedOn: "2026-03-03",
        subject: "PODAS",
        collaborator: "Renan"
      }
    });
    createAprEntry(db, {
      monthRef: "2026-02",
      sourceType: "manual",
      entry: {
        externalId: "APR-001",
        openedOn: "2026-02-01",
        subject: "PODAS",
        collaborator: "Felipe"
      }
    });

    const months = listAprMonthsService(db);
    const rows = getAprRowsService(db, { monthRef: "2026-03", sourceType: "system" });
    const audit = getAprAuditService(db, {
      monthRef: "2026-03",
      filters: { mode: "all", search: null, collaborator: null, subject: null, date: null }
    });
    const history = getAprHistoryService(db, { monthRef: "2026-03", sourceType: "manual" });
    const summary = getAprMonthSummaryService(db, {
      monthRef: "2026-03",
      historySource: "manual"
    });

    expect(months.months.map((month) => [month.monthRef, month.manualCount, month.systemCount])).toEqual([
      ["2026-02", 1, 0],
      ["2026-03", 1, 2]
    ]);
    expect(rows.rows).toHaveLength(2);
    expect(audit.summary).toMatchObject({
      totalSistema: 2,
      totalManual: 1,
      conferido: 1,
      soSistema: 1,
      soManual: 0,
      divergentes: 1,
      statusGeral: "Divergente"
    });
    expect(history.summary).toMatchObject({
      totalAtual: 1,
      totalAnterior: 1,
      alterado: 1
    });
    expect(summary).toMatchObject({
      monthRef: "2026-03",
      manualCount: 1,
      systemCount: 2,
      uniqueCollaborators: 2,
      statusGeral: "Divergente"
    });
  });

  it("creates and updates manual entries, moving the month when the opening date changes", () => {
    const created = createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-010",
        openedOn: "2026-03-04",
        subject: "mapeamento",
        collaborator: "Joao Pedro"
      }
    });

    if ("error" in created) {
      throw new Error(created.error);
    }

    expect(created.savedMonthRef).toBe("2026-03");
    expect(created.row.subject).toBe("MAPEAMENTO");

    const updated = updateAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      entryId: created.row.id,
      payload: {
        externalId: "APR-010",
        openedOn: "2026-04-01",
        subject: "podas",
        collaborator: "Renan"
      }
    });

    if ("error" in updated) {
      throw new Error(updated.error);
    }

    expect(updated.savedMonthRef).toBe("2026-04");
    expect(updated.moved).toBe(true);
    expect(updated.row.monthRef).toBe("2026-04");
    expect(updated.row.subject).toBe("PODAS");
  });

  it("compares audit and history details in a pure service layer", () => {
    const audit = compareAprBases(
      [
        {
          id: 1,
          monthRef: "2026-03",
          sourceType: "system",
          externalId: "APR-001",
          openedOn: "2026-03-01",
          subject: "MAPEAMENTO",
          collaborator: "Felipe",
          rawPayload: null,
          createdAt: "x",
          updatedAt: "x"
        }
      ],
      [
        {
          id: 2,
          monthRef: "2026-03",
          sourceType: "manual",
          externalId: "APR-001",
          openedOn: "2026-03-02",
          subject: "PODAS",
          collaborator: "Renan",
          rawPayload: null,
          createdAt: "x",
          updatedAt: "x"
        }
      ]
    );
    const history = compareAprHistory(
      [
        {
          id: 1,
          monthRef: "2026-03",
          sourceType: "manual",
          externalId: "APR-001",
          openedOn: "2026-03-01",
          subject: "MAPEAMENTO",
          collaborator: "Felipe",
          rawPayload: null,
          createdAt: "x",
          updatedAt: "x"
        }
      ],
      []
    );

    expect(audit.details[0]?.changed).toEqual([
      "Data de abertura",
      "Assunto",
      "Colaborador"
    ]);
    expect(history.details[0]?.status).toBe("Novo");
  });

  it("mantem um catalogo isolado de colaboradores a partir das entradas APR", () => {
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-010",
        openedOn: "2026-03-04",
        subject: "mapeamento",
        collaborator: "Joao Pedro"
      }
    });
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-011",
        openedOn: "2026-03-05",
        subject: "podas",
        collaborator: "joao   pedro"
      }
    });

    const catalog = listAprCollaboratorsService(db, {});

    expect(catalog.collaborators).toHaveLength(1);
    expect(catalog.collaborators[0]).toMatchObject({
      displayName: "Joao Pedro",
      occurrenceCount: 2
    });
  });

  it("cria snapshot e restaura o ultimo estado do mes antes de limpar", () => {
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-050",
        openedOn: "2026-03-07",
        subject: "mapeamento",
        collaborator: "Felipe"
      }
    });

    const snapshot = createAprSnapshotService(db, {
      monthRef: "2026-03",
      payload: { reason: "baseline" }
    });
    expect(snapshot.snapshotId).toBeGreaterThan(0);

    const cleared = clearAprMonthService(db, {
      monthRef: "2026-03",
      payload: {
        reason: "cleanup controlado",
        confirmText: "CLEAR APR MONTH 2026-03"
      }
    });

    expect(cleared).toMatchObject({
      ok: true,
      monthRef: "2026-03"
    });
    expect(getAprRowsService(db, { monthRef: "2026-03" }).rows).toHaveLength(0);

    const restored = restoreLatestAprSnapshotService(db, {
      monthRef: "2026-03",
      payload: {
        reason: "rollback",
        confirmText: "RESTORE APR MONTH 2026-03"
      }
    });

    if ("error" in restored) {
      throw new Error(restored.error);
    }

    expect(restored.ok).toBe(true);
    expect(getAprRowsService(db, { monthRef: "2026-03" }).rows).toHaveLength(1);
    expect(listAprSnapshotsService(db, { monthRef: "2026-03" }).snapshots.length).toBeGreaterThanOrEqual(3);
  });

  it("exige rollback por snapshot ao limpar todo o namespace APR", () => {
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-060",
        openedOn: "2026-03-08",
        subject: "mapeamento",
        collaborator: "Renan"
      }
    });
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-04",
      payload: {
        externalId: "APR-061",
        openedOn: "2026-04-01",
        subject: "podas",
        collaborator: "Felipe"
      }
    });
    createAprSnapshotService(db, {
      payload: { reason: "global-baseline" }
    });

    const cleared = clearAllAprService(db, {
      payload: {
        reason: "reset completo",
        confirmText: "CLEAR ALL APR DATA"
      }
    });

    expect(cleared.ok).toBe(true);
    expect(listAprMonthsService(db).months).toHaveLength(0);
    expect(listAprCollaboratorsService(db, {}).collaborators).toHaveLength(0);

    const restored = restoreLatestAprSnapshotService(db, {
      payload: {
        reason: "rollback global",
        confirmText: "RESTORE ALL APR DATA"
      }
    });

    if ("error" in restored) {
      throw new Error(restored.error);
    }

    expect(restored.ok).toBe(true);
    expect(listAprMonthsService(db).months.map((item) => item.monthRef)).toEqual(["2026-03", "2026-04"]);
    expect(listAprCollaboratorsService(db, {}).collaborators).toHaveLength(2);
  });
});
