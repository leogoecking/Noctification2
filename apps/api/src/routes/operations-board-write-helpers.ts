import type Database from "better-sqlite3";
import { logAudit, nowIso, sanitizeMetadata } from "../db";
import type {
  BoardEventType,
  BoardMessageRow,
  BoardViewedResult,
  MuralCategory
} from "./operations-board-types";
import { fetchBoardMessageById, listBoardEvents } from "./operations-board-read-helpers";

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

export const recordBoardView = (
  db: Database.Database,
  params: {
    message: BoardMessageRow;
    actorUserId: number;
    actorName: string;
    actorLogin: string;
  }
): BoardViewedResult => {
  const timestamp = nowIso();

  if (params.actorUserId === params.message.authorUserId) {
    return {
      recorded: false,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorLogin: params.actorLogin,
      viewedAt: timestamp
    };
  }

  const existing = db
    .prepare("SELECT 1 FROM operations_board_events WHERE message_id = ? AND actor_user_id = ? LIMIT 1")
    .get(params.message.id, params.actorUserId);

  if (existing) {
    return {
      recorded: false,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorLogin: params.actorLogin,
      viewedAt: timestamp
    };
  }

  logBoardEvent(db, {
    messageId: params.message.id,
    actorUserId: params.actorUserId,
    eventType: "viewed",
    createdAt: timestamp
  });

  return {
    recorded: true,
    actorUserId: params.actorUserId,
    actorName: params.actorName,
    actorLogin: params.actorLogin,
    viewedAt: timestamp
  };
};
