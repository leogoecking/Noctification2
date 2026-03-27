import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../config";
import { connectDatabase, runMigrations } from "../db";
import { createAprEntry } from "../modules/apr/repository";
import { createAprRouter } from "../modules/apr/routes";
import { createMockResponse, getRouteHandler } from "./route-test-helpers";

const testConfig: AppConfig = {
  nodeEnv: "test",
  port: 0,
  dbPath: ":memory:",
  reminderTimezone: "America/Bahia",
  jwtSecret: "test-secret",
  jwtExpiresHours: 8,
  corsOrigin: "http://localhost:5173",
  corsOrigins: ["http://localhost:5173"],
  cookieName: "nc_access",
  cookieSecure: false,
  allowInsecureFixedAdmin: true,
  enableReminderScheduler: false,
  enableAprModule: true,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("APR routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let aprRouter: ReturnType<typeof createAprRouter>;

  const authUser = {
    id: 1,
    login: "admin",
    name: "Administrador",
    role: "admin" as const
  };

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    aprRouter = createAprRouter(db, testConfig);

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
        subject: "MAPEAMENTO",
        collaborator: "Felipe"
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
  });

  afterEach(() => {
    db.close();
  });

  it("expone listMonths, getMonthSummary, getRows, audit e history no contrato HTTP", () => {
    const listCollaborators = getRouteHandler(aprRouter, "/collaborators", "get");
    const listSubjects = getRouteHandler(aprRouter, "/subjects", "get");
    const listMonths = getRouteHandler(aprRouter, "/months", "get");
    const listSnapshots = getRouteHandler(aprRouter, "/snapshots", "get");
    const getSummary = getRouteHandler(aprRouter, "/months/:month/summary", "get");
    const getRows = getRouteHandler(aprRouter, "/months/:month/rows", "get");
    const getAudit = getRouteHandler(aprRouter, "/months/:month/audit", "get");
    const getHistory = getRouteHandler(aprRouter, "/months/:month/history", "get");

    const collaboratorsRes = createMockResponse();
    listCollaborators({ authUser }, collaboratorsRes);
    expect(collaboratorsRes.statusCode).toBe(200);
    expect((collaboratorsRes.body as { collaborators: Array<{ displayName: string }> }).collaborators).toHaveLength(1);

    const subjectsRes = createMockResponse();
    listSubjects({ authUser }, subjectsRes);
    expect(subjectsRes.statusCode).toBe(200);
    expect((subjectsRes.body as { subjects: Array<{ subject: string }> }).subjects).toEqual([
      { subject: "MAPEAMENTO", occurrenceCount: 2 },
      { subject: "PODAS", occurrenceCount: 1 }
    ]);

    const listRes = createMockResponse();
    listMonths({ authUser }, listRes);
    expect(listRes.statusCode).toBe(200);
    expect((listRes.body as { months: Array<{ monthRef: string }> }).months).toHaveLength(2);

    const snapshotsRes = createMockResponse();
    listSnapshots({ authUser }, snapshotsRes);
    expect(snapshotsRes.statusCode).toBe(200);
    expect((snapshotsRes.body as { snapshots: unknown[] }).snapshots).toHaveLength(0);

    const summaryRes = createMockResponse();
    getSummary(
      {
        authUser,
        params: { month: "2026-03" },
        query: { history_source: "manual" }
      },
      summaryRes
    );
    expect(summaryRes.statusCode).toBe(200);
    expect((summaryRes.body as { monthRef: string }).monthRef).toBe("2026-03");

    const rowsRes = createMockResponse();
    getRows(
      {
        authUser,
        params: { month: "2026-03" },
        query: { source: "manual" }
      },
      rowsRes
    );
    expect(rowsRes.statusCode).toBe(200);
    expect((rowsRes.body as { rows: unknown[] }).rows).toHaveLength(1);

    const auditRes = createMockResponse();
    getAudit(
      {
        authUser,
        params: { month: "2026-03" },
        query: { mode: "all" }
      },
      auditRes
    );
    expect(auditRes.statusCode).toBe(200);
    expect((auditRes.body as { summary: { statusGeral: string } }).summary.statusGeral).toBe(
      "Conferido"
    );

    const historyRes = createMockResponse();
    getHistory(
      {
        authUser,
        params: { month: "2026-03" },
        query: { source: "manual" }
      },
      historyRes
    );
    expect(historyRes.statusCode).toBe(200);
    expect((historyRes.body as { previousMonthRef: string }).previousMonthRef).toBe("2026-02");
  });

  it("permite criar, atualizar e excluir um lancamento manual", () => {
    const createManual = getRouteHandler(aprRouter, "/months/:month/manual", "post");
    const updateManual = getRouteHandler(aprRouter, "/months/:month/manual/:entryId", "patch");
    const deleteManual = getRouteHandler(aprRouter, "/months/:month/manual/:entryId", "delete");

    const createRes = createMockResponse();
    createManual(
      {
        authUser,
        params: { month: "2026-03" },
        body: {
          external_id: "APR-010",
          opened_on: "2026-03-04",
          subject: "podas",
          collaborator: "Renan"
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    const createdRow = (createRes.body as { row: { id: number } }).row;

    const updateRes = createMockResponse();
    updateManual(
      {
        authUser,
        params: { month: "2026-03", entryId: String(createdRow.id) },
        body: {
          external_id: "APR-010",
          opened_on: "2026-04-01",
          subject: "mapeamento",
          collaborator: "Joao Pedro"
        }
      },
      updateRes
    );

    expect(updateRes.statusCode).toBe(200);
    expect((updateRes.body as { moved: boolean; savedMonthRef: string }).moved).toBe(true);
    expect((updateRes.body as { savedMonthRef: string }).savedMonthRef).toBe("2026-04");

    const deleteRes = createMockResponse();
    deleteManual(
      {
        authUser,
        params: { month: "2026-04", entryId: String(createdRow.id) }
      },
      deleteRes
    );

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toEqual({
      ok: true,
      deletedId: createdRow.id,
      monthRef: "2026-04"
    });
  });

  it("protege clear, snapshot e restore com validacao explicita", () => {
    const createSnapshot = getRouteHandler(aprRouter, "/months/:month/snapshots", "post");
    const clearMonth = getRouteHandler(aprRouter, "/months/:month/clear", "post");
    const restoreMonth = getRouteHandler(aprRouter, "/months/:month/restore-last", "post");
    const clearAll = getRouteHandler(aprRouter, "/clear-all", "post");

    const snapshotRes = createMockResponse();
    createSnapshot(
      {
        authUser,
        params: { month: "2026-03" },
        body: { reason: "baseline operacional" }
      },
      snapshotRes
    );

    expect(snapshotRes.statusCode).toBe(201);
    expect((snapshotRes.body as { snapshotId: number }).snapshotId).toBeGreaterThan(0);

    const clearRes = createMockResponse();
    clearMonth(
      {
        authUser,
        params: { month: "2026-03" },
        body: {
          reason: "limpeza controlada",
          confirm_text: "CLEAR APR MONTH 2026-03"
        }
      },
      clearRes
    );

    expect(clearRes.statusCode).toBe(200);
    expect((clearRes.body as { ok: boolean }).ok).toBe(true);

    const restoreRes = createMockResponse();
    restoreMonth(
      {
        authUser,
        params: { month: "2026-03" },
        body: {
          reason: "rollback imediato",
          confirm_text: "RESTORE APR MONTH 2026-03"
        }
      },
      restoreRes
    );

    expect(restoreRes.statusCode).toBe(200);
    expect((restoreRes.body as { ok: boolean }).ok).toBe(true);

    const badClearAllRes = createMockResponse();
    clearAll(
      {
        authUser,
        body: {
          reason: "limpeza insegura",
          confirm_text: "CLEAR APR"
        }
      },
      badClearAllRes
    );

    expect(badClearAllRes.statusCode).toBe(400);
    expect((badClearAllRes.body as { error: string }).error).toBe(
      "confirm_text deve ser exatamente CLEAR ALL APR DATA"
    );
  });

  it("valida payloads e params invalidos no contrato HTTP do APR", () => {
    const createManual = getRouteHandler(aprRouter, "/months/:month/manual", "post");
    const getAudit = getRouteHandler(aprRouter, "/months/:month/audit", "get");
    const importRows = getRouteHandler(aprRouter, "/import/:source", "post");
    const createSnapshot = getRouteHandler(aprRouter, "/snapshots", "post");

    const createRes = createMockResponse();
    createManual(
      {
        authUser,
        params: { month: "2026-03" },
        body: {
          external_id: "",
          opened_on: "03/04/2026",
          subject: "",
          collaborator: ""
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(400);
    expect((createRes.body as { error: string }).error).toBe("external_id e obrigatorio");

    const auditRes = createMockResponse();
    getAudit(
      {
        authUser,
        params: { month: "2026-03" },
        query: { mode: "invalid" }
      },
      auditRes
    );

    expect(auditRes.statusCode).toBe(400);
    expect((auditRes.body as { error: string }).error).toBe("mode deve ser all ou missing");

    const importRes = createMockResponse();
    void importRows(
      {
        authUser,
        params: { source: "invalid" }
      },
      importRes
    );

    expect(importRes.statusCode).toBe(400);
    expect((importRes.body as { error: string }).error).toBe("source deve ser manual ou system");

    const snapshotRes = createMockResponse();
    createSnapshot(
      {
        authUser,
        body: {}
      },
      snapshotRes
    );

    expect(snapshotRes.statusCode).toBe(400);
    expect((snapshotRes.body as { error: string }).error).toBe("reason e obrigatorio");
  });
});
