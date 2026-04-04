import type Database from "better-sqlite3";
import type { BoardEventRow, BoardMessageRow } from "./operations-board-types";

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

export const fetchBoardMessageById = (
  db: Database.Database,
  messageId: number
): BoardMessageRow | undefined =>
  db.prepare(`${boardMessageSelectSql} WHERE m.id = ?`).get(messageId) as
    | BoardMessageRow
    | undefined;

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
