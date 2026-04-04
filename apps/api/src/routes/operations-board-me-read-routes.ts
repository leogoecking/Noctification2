import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { emitBoardViewed } from "../socket";
import { parsePositiveId, requireAuthUser } from "./me-route-shared";
import {
  fetchBoardMessageById,
  listBoardEvents,
  listBoardMessages,
  normalizeBoardMessage,
  recordBoardView
} from "./operations-board-service";

interface RegisterOperationsBoardReadRoutesParams {
  router: Router;
  db: Database.Database;
  io: Server;
}

export const registerOperationsBoardReadRoutes = ({
  router,
  db,
  io
}: RegisterOperationsBoardReadRoutesParams) => {
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
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const messageId = parsePositiveId(req.params.id);
    if (!messageId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const message = fetchBoardMessageById(db, messageId);
    if (!message) {
      res.status(404).json({ error: "Recado nao encontrado" });
      return;
    }

    const viewResult = recordBoardView(db, {
      message,
      actorUserId: authUser.id,
      actorName: authUser.name,
      actorLogin: authUser.login
    });

    if (viewResult.recorded) {
      emitBoardViewed(io, {
        messageId: message.id,
        actorUserId: viewResult.actorUserId,
        actorName: viewResult.actorName,
        actorLogin: viewResult.actorLogin,
        viewedAt: viewResult.viewedAt
      });
    }

    res.json({
      message: normalizeBoardMessage(message),
      timeline: listBoardEvents(db, messageId)
    });
  });
};
