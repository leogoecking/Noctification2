import { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";
import { logAudit, nowIso, sanitizeMetadata } from "../db";
import { authenticate } from "../middleware/auth";

type BoardMessageRow = {
  id: number;
  title: string;
  body: string;
  status: "active" | "resolved";
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

type BoardEventRow = {
  id: number;
  messageId: number;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  eventType: "created" | "updated" | "commented" | "resolved" | "reopened";
  body: string | null;
  metadataJson: string | null;
  createdAt: string;
};

const boardMessageSelectSql = `
  SELECT
    m.id,
    m.title,
    m.body,
    m.status,
    m.author_user_id AS authorUserId,
    author.name AS authorName,
    author.login AS authorLogin,
    m.created_at AS createdAt,
    m.updated_at AS updatedAt,
    m.resolved_at AS resolvedAt
  FROM operations_board_messages m
  INNER JOIN users author ON author.id = m.author_user_id
`;

const boardEventSelectSql = `
  SELECT
    e.id,
    e.message_id AS messageId,
    e.actor_user_id AS actorUserId,
    actor.name AS actorName,
    actor.login AS actorLogin,
    e.event_type AS eventType,
    e.body,
    e.metadata_json AS metadataJson,
    e.created_at AS createdAt
  FROM operations_board_events e
  INNER JOIN users actor ON actor.id = e.actor_user_id
`;

const parseMetadata = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeMessage = (row: BoardMessageRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  status: row.status,
  authorUserId: row.authorUserId,
  authorName: row.authorName,
  authorLogin: row.authorLogin,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  resolvedAt: row.resolvedAt
});

const normalizeEvent = (row: BoardEventRow) => ({
  id: row.id,
  messageId: row.messageId,
  actorUserId: row.actorUserId,
  actorName: row.actorName,
  actorLogin: row.actorLogin,
  eventType: row.eventType,
  body: row.body,
  metadata: parseMetadata(row.metadataJson),
  createdAt: row.createdAt
});

const fetchBoardMessageById = (db: Database.Database, messageId: number): BoardMessageRow | undefined =>
  db.prepare(`${boardMessageSelectSql} WHERE m.id = ?`).get(messageId) as BoardMessageRow | undefined;

const listBoardEvents = (db: Database.Database, messageId: number) =>
  (
    db
      .prepare(
        `${boardEventSelectSql}
         WHERE e.message_id = ?
         ORDER BY e.created_at DESC, e.id DESC`
      )
      .all(messageId) as BoardEventRow[]
  ).map(normalizeEvent);

const logBoardEvent = (
  db: Database.Database,
  params: {
    messageId: number;
    actorUserId: number;
    eventType: BoardEventRow["eventType"];
    body?: string | null;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
) => {
  db.prepare(
    `
      INSERT INTO operations_board_events (
        message_id,
        actor_user_id,
        event_type,
        body,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.messageId,
    params.actorUserId,
    params.eventType,
    params.body ?? null,
    sanitizeMetadata(params.metadata),
    params.createdAt ?? nowIso()
  );
};

const parseStatus = (value: unknown): "active" | "resolved" | undefined => {
  if (value === "active" || value === "resolved") {
    return value;
  }

  return undefined;
};

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

    const whereClause = status === "all" ? "" : "WHERE m.status = ?";
    const values = status === "all" ? [limit] : [status, limit];
    const messages = db
      .prepare(
        `${boardMessageSelectSql}
         ${whereClause}
         ORDER BY
           CASE WHEN m.status = 'active' THEN 0 ELSE 1 END,
           m.updated_at DESC,
           m.id DESC
         LIMIT ?`
      )
      .all(...values) as BoardMessageRow[];

    res.json({
      messages: messages.map(normalizeMessage)
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
      message: normalizeMessage(message),
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

    const timestamp = nowIso();
    const result = db
      .prepare(
        `
          INSERT INTO operations_board_messages (
            title,
            body,
            status,
            author_user_id,
            created_at,
            updated_at,
            resolved_at
          ) VALUES (?, ?, 'active', ?, ?, ?, NULL)
        `
      )
      .run(title, body, req.authUser.id, timestamp, timestamp);

    const messageId = Number(result.lastInsertRowid);
    logBoardEvent(db, {
      messageId,
      actorUserId: req.authUser.id,
      eventType: "created",
      metadata: {
        title
      },
      createdAt: timestamp
    });
    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "operations_board.created",
      targetType: "operations_board_message",
      targetId: messageId
    });

    const message = fetchBoardMessageById(db, messageId);
    res.status(201).json({ message: normalizeMessage(message as BoardMessageRow) });
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
    const parsedStatus = parseStatus(rawStatus);
    if (rawStatus !== undefined && parsedStatus === undefined) {
      res.status(400).json({ error: "status invalido" });
      return;
    }

    const nextStatus = parsedStatus ?? existing.status;

    if (!nextTitle || !nextBody) {
      res.status(400).json({ error: "title e body nao podem ficar vazios" });
      return;
    }

    const timestamp = nowIso();
    const resolvedAt = nextStatus === "resolved" ? existing.resolvedAt ?? timestamp : null;

    db.prepare(
      `
        UPDATE operations_board_messages
        SET
          title = ?,
          body = ?,
          status = ?,
          updated_at = ?,
          resolved_at = ?
        WHERE id = ?
      `
    ).run(nextTitle, nextBody, nextStatus, timestamp, resolvedAt, messageId);

    if (nextTitle !== existing.title || nextBody !== existing.body) {
      logBoardEvent(db, {
        messageId,
        actorUserId: req.authUser.id,
        eventType: "updated",
        metadata: {
          previousTitle: existing.title,
          previousBody: existing.body,
          nextTitle,
          nextBody
        },
        createdAt: timestamp
      });
    }

    if (existing.status !== nextStatus) {
      logBoardEvent(db, {
        messageId,
        actorUserId: req.authUser.id,
        eventType: nextStatus === "resolved" ? "resolved" : "reopened",
        createdAt: timestamp
      });
    }

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "operations_board.updated",
      targetType: "operations_board_message",
      targetId: messageId,
      metadata: {
        status: nextStatus
      }
    });

    const message = fetchBoardMessageById(db, messageId);
    res.json({ message: normalizeMessage(message as BoardMessageRow) });
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

    const timestamp = nowIso();
    logBoardEvent(db, {
      messageId,
      actorUserId: req.authUser.id,
      eventType: "commented",
      body,
      createdAt: timestamp
    });
    db.prepare("UPDATE operations_board_messages SET updated_at = ? WHERE id = ?").run(
      timestamp,
      messageId
    );

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "operations_board.commented",
      targetType: "operations_board_message",
      targetId: messageId
    });

    const timeline = listBoardEvents(db, messageId);
    res.status(201).json({ event: timeline[0] });
  });

  return router;
};
