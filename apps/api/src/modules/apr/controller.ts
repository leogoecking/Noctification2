import type Database from "better-sqlite3";
import type { Request, Response } from "express";
import { parseAprImportRequest } from "./import";
import {
  validateAprClearPayload,
  buildAprAuditFilters,
  parseAprEntryIdParam,
  parseAprHistorySource,
  parseAprMonthParam,
  parseAprSourceType,
  validateAprRestorePayload,
  validateAprManualPayload,
  validateAprSnapshotPayload
} from "./validators";
import {
  clearAllAprService,
  clearAprMonthService,
  createAprManualEntryService,
  createAprSnapshotService,
  deleteAprManualEntryService,
  getAprAuditService,
  listAprCollaboratorsService,
  getAprHistoryService,
  getAprMonthSummaryService,
  getAprRowsService,
  importAprRowsService,
  listAprSnapshotsService,
  listAprMonthsService,
  restoreLatestAprSnapshotService,
  updateAprManualEntryService
} from "./service";

export const createAprController = (db: Database.Database) => ({
  listCollaborators: (req: Request, res: Response) => {
    const search = typeof req.query?.search === "string" ? req.query.search : undefined;
    res.json(listAprCollaboratorsService(db, { search }));
  },

  listMonths: (_req: Request, res: Response) => {
    res.json(listAprMonthsService(db));
  },

  listSnapshots: (req: Request, res: Response) => {
    const rawMonth = req.params?.month;
    const monthRef = parseAprMonthParam(rawMonth);
    if (rawMonth !== undefined && !monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    res.json(listAprSnapshotsService(db, { monthRef: monthRef ?? undefined }));
  },

  createSnapshot: (req: Request, res: Response) => {
    const rawMonth = req.params?.month;
    const monthRef = parseAprMonthParam(rawMonth);
    if (rawMonth !== undefined && !monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const parsedPayload = validateAprSnapshotPayload(req.body);
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    res.status(201).json(
      createAprSnapshotService(db, {
        monthRef: monthRef ?? undefined,
        payload: parsedPayload.value
      })
    );
  },

  getMonthSummary: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const historySource = parseAprHistorySource(req.query.history_source);
    if (!historySource) {
      res.status(400).json({ error: "history_source deve ser manual ou system" });
      return;
    }

    res.json(getAprMonthSummaryService(db, { monthRef, historySource }));
  },

  getRows: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const sourceType = parseAprSourceType(req.query.source);
    if (sourceType === null) {
      res.status(400).json({ error: "source deve ser manual ou system" });
      return;
    }

    res.json(getAprRowsService(db, { monthRef, sourceType: sourceType ?? undefined }));
  },

  createManual: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const parsedPayload = validateAprManualPayload(req.body);
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    const result = createAprManualEntryService(db, {
      requestedMonthRef: monthRef,
      payload: parsedPayload.value
    });
    if ("error" in result && typeof result.status === "number") {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(201).json(result);
  },

  updateManual: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const entryId = parseAprEntryIdParam(req.params.entryId);
    if (!entryId) {
      res.status(400).json({ error: "entryId invalido" });
      return;
    }

    const parsedPayload = validateAprManualPayload(req.body);
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    const result = updateAprManualEntryService(db, {
      requestedMonthRef: monthRef,
      entryId,
      payload: parsedPayload.value
    });
    if ("error" in result && typeof result.status === "number") {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  },

  deleteManual: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const entryId = parseAprEntryIdParam(req.params.entryId);
    if (!entryId) {
      res.status(400).json({ error: "entryId invalido" });
      return;
    }

    const result = deleteAprManualEntryService(db, {
      requestedMonthRef: monthRef,
      entryId
    });
    if ("error" in result && typeof result.status === "number") {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  },

  importRows: async (req: Request, res: Response) => {
    const sourceType = parseAprSourceType(req.params.source);
    if (!sourceType) {
      res.status(400).json({ error: "source deve ser manual ou system" });
      return;
    }

    try {
      const parsedUpload = await parseAprImportRequest(req, sourceType);
      res.status(201).json(importAprRowsService(db, parsedUpload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao importar arquivo APR";
      res.status(400).json({ error: message });
    }
  },

  audit: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const parsedFilters = buildAprAuditFilters(req.query as Record<string, unknown>);
    if ("error" in parsedFilters) {
      res.status(400).json({ error: parsedFilters.error });
      return;
    }

    res.json(getAprAuditService(db, { monthRef, filters: parsedFilters.value }));
  },

  history: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const sourceType = parseAprHistorySource(req.query.source);
    if (!sourceType) {
      res.status(400).json({ error: "source deve ser manual ou system" });
      return;
    }

    res.json(getAprHistoryService(db, { monthRef, sourceType }));
  },

  restoreLatest: (req: Request, res: Response) => {
    const rawMonth = req.params?.month;
    const monthRef = parseAprMonthParam(rawMonth);
    if (rawMonth !== undefined && !monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const expectedConfirmText = monthRef
      ? `RESTORE APR MONTH ${monthRef}`
      : "RESTORE ALL APR DATA";
    const parsedPayload = validateAprRestorePayload(req.body, expectedConfirmText);
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    const result = restoreLatestAprSnapshotService(db, {
      monthRef: monthRef ?? undefined,
      payload: parsedPayload.value
    });
    if ("error" in result && typeof result.status === "number") {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  },

  clearMonth: (req: Request, res: Response) => {
    const monthRef = parseAprMonthParam(req.params.month);
    if (!monthRef) {
      res.status(400).json({ error: "month invalido. Use YYYY-MM" });
      return;
    }

    const parsedPayload = validateAprClearPayload(req.body, `CLEAR APR MONTH ${monthRef}`);
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    res.json(
      clearAprMonthService(db, {
        monthRef,
        payload: parsedPayload.value
      })
    );
  },

  clearAll: (req: Request, res: Response) => {
    const parsedPayload = validateAprClearPayload(req.body, "CLEAR ALL APR DATA");
    if ("error" in parsedPayload) {
      res.status(400).json({ error: parsedPayload.error });
      return;
    }

    res.json(
      clearAllAprService(db, {
        payload: parsedPayload.value
      })
    );
  }
});
