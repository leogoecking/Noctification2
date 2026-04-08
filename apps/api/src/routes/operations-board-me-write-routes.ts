import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { emitBoardChanged } from "../socket";
import { parsePositiveId, requireAuthUser } from "./me-route-shared";
import {
  addBoardComment,
  createBoardMessage,
  fetchBoardMessageById,
  normalizeBoardMessage,
  parseOperationsBoardStatus,
  parseMuralCategory,
  updateBoardMessage
} from "./operations-board-service";

interface RegisterOperationsBoardWriteRoutesParams {
  router: Router;
  db: Database.Database;
  io: Server;
}

export const registerOperationsBoardWriteRoutes = ({
  router,
  db,
  io
}: RegisterOperationsBoardWriteRoutesParams) => {
  router.post("/operations-board", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
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
      actorUserId: authUser.id
    });
    emitBoardChanged(io, { event: "created", messageId: message.id });
    res.status(201).json({ message: normalizeBoardMessage(message) });
  });

  router.patch("/operations-board/:id", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const messageId = parsePositiveId(req.params.id);
    if (!messageId) {
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
      actorUserId: authUser.id
    });
    emitBoardChanged(io, { event: "updated", messageId: message.id });
    res.json({ message: normalizeBoardMessage(message) });
  });

  router.post("/operations-board/:id/comments", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const messageId = parsePositiveId(req.params.id);
    if (!messageId) {
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
      actorUserId: authUser.id,
      body
    });
    emitBoardChanged(io, { event: "commented", messageId });
    res.status(201).json({ event });
  });
};
