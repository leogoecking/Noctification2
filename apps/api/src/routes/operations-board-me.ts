import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate } from "../middleware/auth";
import { registerOperationsBoardReadRoutes } from "./operations-board-me-read-routes";
import { registerOperationsBoardWriteRoutes } from "./operations-board-me-write-routes";

export const createOperationsBoardMeRouter = (
  db: Database.Database,
  io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  registerOperationsBoardReadRoutes({
    router,
    db,
    io
  });
  registerOperationsBoardWriteRoutes({
    router,
    db
  });

  return router;
};
