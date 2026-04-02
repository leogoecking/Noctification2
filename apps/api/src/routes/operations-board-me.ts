import { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";
import { authenticate } from "../middleware/auth";
import {
  addBoardComment,
  createBoardMessage,
  fetchBoardMessageById,
  listBoardEvents,
  listBoardMessages,
  normalizeBoardMessage,
  parseOperationsBoardStatus,
  parseMuralCategory,
  updateBoardMessage
} from "./operations-board-service";

export const createOperationsBoardMeRouter = (
  db: Database.Database,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/operations-board", (req, res) => {
    const status = String(req.query.status ?? "active");
    const limit = Math.min(Math.max(Number(req.query.limit ?? 6) || 6, 1), 20);

    if (status !== "active" && status !== "resolved" && status !== "all") {
      res.status(400).json({ error: "status invalido" });
      return;
    }

    res.json({
      messages: listBoardMessages(db, { status, limit })
    });
  });

  router.get("/operations-board/:id", (req, res) => {
    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const message = fetchBoardMessageById(db, messageId);
    if (!message) {
      res.status(404).json({ error: "Recado nao encontrado" });
      return;
    }

    res.json({
      message: normalizeBoardMessage(message),
      timeline: listBoardEvents(db, messageId)
    });
  });

  router.post("/operations-board", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!title || !body) {
      res.status(400).json({ error: "title e body sao obrigatorios" });
      return;
    }

    const category = parseMuralCategory(req.body?.category) ?? "geral";

    const message = createBoardMessage(db, {
      title,
      body,
      category,
      actorUserId: req.authUser.id
    });
    res.status(201).json({ message: normalizeBoardMessage(message) });
  });

  router.patch("/operations-board/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchBoardMessageById(db, messageId);
    if (!existing) {
      res.status(404).json({ error: "Recado nao encontrado" });
      return;
    }

    const nextTitle =
      typeof req.body?.title === "string" ? req.body.title.trim() : existing.title;
    const nextBody =
      typeof req.body?.body === "string" ? req.body.body.trim() : existing.body;
    const rawStatus = req.body?.status;
    const parsedStatus = parseOperationsBoardStatus(rawStatus);
    if (rawStatus !== undefined && parsedStatus === undefined) {
      res.status(400).json({ error: "status invalido" });
      return;
    }

    const nextStatus = parsedStatus ?? existing.status;
    const nextCategory = parseMuralCategory(req.body?.category) ?? existing.category;

    if (!nextTitle || !nextBody) {
      res.status(400).json({ error: "title e body nao podem ficar vazios" });
      return;
    }

    const message = updateBoardMessage(db, {
      existing,
      nextTitle,
      nextBody,
      nextStatus,
      nextCategory,
      actorUserId: req.authUser.id
    });
    res.json({ message: normalizeBoardMessage(message) });
  });

  router.post("/operations-board/:id/comments", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchBoardMessageById(db, messageId);
    if (!existing) {
      res.status(404).json({ error: "Recado nao encontrado" });
      return;
    }

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) {
      res.status(400).json({ error: "body e obrigatorio" });
      return;
    }

    const event = addBoardComment(db, {
      messageId,
      actorUserId: req.authUser.id,
      body
    });
    res.status(201).json({ event });
  });

  return router;
};
