import { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../../config";
import { authenticate } from "../../middleware/auth";
import { createAprController } from "./controller";

export const createAprRouter = (db: Database.Database, config: AppConfig) => {
  const router = Router();
  const controller = createAprController(db);

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      module: "apr"
    });
  });

  router.use(authenticate(db, config));

  router.get("/collaborators", controller.listCollaborators);
  router.get("/months", controller.listMonths);
  router.get("/snapshots", controller.listSnapshots);
  router.post("/snapshots", controller.createSnapshot);
  router.post("/restore-last", controller.restoreLatest);
  router.post("/clear-all", controller.clearAll);
  router.post("/import/:source", controller.importRows);
  router.get("/months/:month/snapshots", controller.listSnapshots);
  router.post("/months/:month/snapshots", controller.createSnapshot);
  router.post("/months/:month/restore-last", controller.restoreLatest);
  router.post("/months/:month/clear", controller.clearMonth);
  router.get("/months/:month/summary", controller.getMonthSummary);
  router.get("/months/:month/rows", controller.getRows);
  router.post("/months/:month/manual", controller.createManual);
  router.patch("/months/:month/manual/:entryId", controller.updateManual);
  router.delete("/months/:month/manual/:entryId", controller.deleteManual);
  router.get("/months/:month/audit", controller.audit);
  router.get("/months/:month/history", controller.history);

  return router;
};
