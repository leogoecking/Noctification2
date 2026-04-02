import type Database from "better-sqlite3";
import { logAudit, nowIso, sanitizeMetadata } from "../db";

export type MuralCategory = "urgente" | "info" | "aviso" | "comunicado" | "procedimento" | "geral";

export type BoardMessageRow = {
  id: number;
  title: string;
  body: string;
  status: "active" | "resolved";
  category: MuralCategory;
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export const VALID_CATEGORIES: MuralCategory[] = [
  "urgente", "info", "aviso", "comunicado", "procedimento", "geral"
];

export const parseMuralCategory = (value: unknown): MuralCategory | undefined => {
  if (typeof value === "string" && (VALID_CATEGORIES as string[]).includes(value)) {
    return value as MuralCategory;
  }
  return undefined;
};

type BoardEventType = "created" | "updated" | "commented" | "resolved" | "reopened";

export type BoardEventRow = {
  id: number;
  messageId: number;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  eventType: BoardEventType;
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
    m.category,
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

export const parseOperationsBoardStatus = (value: unknown): "active" | "resolved" | undefined => {
  if (value === "active" || value === "resolved") {
    return value;
  }

  return undefined;
};

export const normalizeBoardMessage = (row: BoardMessageRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  status: row.status,
  category: row.category,
  authorUserId: row.authorUserId,
  authorName: row.authorName,
  authorLogin: row.authorLogin,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  resolvedAt: row.resolvedAt
});

const normalizeBoardEvent = (row: BoardEventRow) => ({
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

export const fetchBoardMessageById = (db: Database.Database, messageId: number): BoardMessageRow | undefined =>
  db.prepare(`${boardMessageSelectSql} WHERE m.id = ?`).get(messageId) as BoardMessageRow | undefined;

export const listBoardMessages = (
  db: Database.Database,
  params: { status: "active" | "resolved" | "all"; limit: number }
) => {
  const whereClause = params.status === "all" ? "" : "WHERE m.status = ?";
  const values = params.status === "all" ? [params.limit] : [params.status, params.limit];

  return (
    db
      .prepare(
        `${boardMessageSelectSql}
         ${whereClause}
         ORDER BY
           CASE WHEN m.status = 'active' THEN 0 ELSE 1 END,
           m.updated_at DESC,
           m.id DESC
         LIMIT ?`
      )
      .all(...values) as BoardMessageRow[]
  ).map(normalizeBoardMessage);
};

export const listBoardEvents = (db: Database.Database, messageId: number) =>
  (
    db
      .prepare(
        `${boardEventSelectSql}
         WHERE e.message_id = ?
         ORDER BY e.created_at DESC, e.id DESC`
      )
      .all(messageId) as BoardEventRow[]
  ).map(normalizeBoardEvent);

export const logBoardEvent = (
  db: Database.Database,
  params: {
    messageId: number;
    actorUserId: number;
    eventType: BoardEventType;
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

export const createBoardMessage = (
  db: Database.Database,
  params: {
    title: string;
    body: string;
    category: MuralCategory;
    actorUserId: number;
  }
) => {
  const timestamp = nowIso();
  const result = db
    .prepare(
      `
        INSERT INTO operations_board_messages (
          title,
          body,
          status,
          category,
          author_user_id,
          created_at,
          updated_at,
          resolved_at
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, NULL)
      `
    )
    .run(params.title, params.body, params.category, params.actorUserId, timestamp, timestamp);

  const messageId = Number(result.lastInsertRowid);
  logBoardEvent(db, {
    messageId,
    actorUserId: params.actorUserId,
    eventType: "created",
    metadata: {
      title: params.title
    },
    createdAt: timestamp
  });
  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: "operations_board.created",
    targetType: "operations_board_message",
    targetId: messageId
  });

  return fetchBoardMessageById(db, messageId) as BoardMessageRow;
};

export const updateBoardMessage = (
  db: Database.Database,
  params: {
    existing: BoardMessageRow;
    nextTitle: string;
    nextBody: string;
    nextStatus: "active" | "resolved";
    nextCategory: MuralCategory;
    actorUserId: number;
  }
) => {
  const timestamp = nowIso();
  const resolvedAt =
    params.nextStatus === "resolved" ? params.existing.resolvedAt ?? timestamp : null;

  db.prepare(
    `
      UPDATE operations_board_messages
      SET
        title = ?,
        body = ?,
        status = ?,
        category = ?,
        updated_at = ?,
        resolved_at = ?
      WHERE id = ?
    `
  ).run(
    params.nextTitle,
    params.nextBody,
    params.nextStatus,
    params.nextCategory,
    timestamp,
    resolvedAt,
    params.existing.id
  );

  if (params.nextTitle !== params.existing.title || params.nextBody !== params.existing.body) {
    logBoardEvent(db, {
      messageId: params.existing.id,
      actorUserId: params.actorUserId,
      eventType: "updated",
      metadata: {
        previousTitle: params.existing.title,
        previousBody: params.existing.body,
        nextTitle: params.nextTitle,
        nextBody: params.nextBody
      },
      createdAt: timestamp
    });
  }

  if (params.existing.status !== params.nextStatus) {
    logBoardEvent(db, {
      messageId: params.existing.id,
      actorUserId: params.actorUserId,
      eventType: params.nextStatus === "resolved" ? "resolved" : "reopened",
      createdAt: timestamp
    });
  }

  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: "operations_board.updated",
    targetType: "operations_board_message",
    targetId: params.existing.id,
    metadata: {
      status: params.nextStatus
    }
  });

  return fetchBoardMessageById(db, params.existing.id) as BoardMessageRow;
};

export const addBoardComment = (
  db: Database.Database,
  params: {
    messageId: number;
    actorUserId: number;
    body: string;
  }
) => {
  const timestamp = nowIso();
  logBoardEvent(db, {
    messageId: params.messageId,
    actorUserId: params.actorUserId,
    eventType: "commented",
    body: params.body,
    createdAt: timestamp
  });
  db.prepare("UPDATE operations_board_messages SET updated_at = ? WHERE id = ?").run(
    timestamp,
    params.messageId
  );

  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: "operations_board.commented",
    targetType: "operations_board_message",
    targetId: params.messageId
  });

  return listBoardEvents(db, params.messageId)[0];
};
