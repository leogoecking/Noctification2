import type Database from "better-sqlite3";

interface AuditRow {
  id: number;
  eventType: string;
  targetType: string;
  targetId: number | null;
  metadataJson: string | null;
  createdAt: string;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
}

const parseMetadata = (json: string | null): Record<string, unknown> | null => {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const buildAdminAuditWhere = (params: {
  eventType: string | null;
  from: string | null;
  to: string | null;
}) => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (params.eventType) {
    conditions.push("a.event_type = ?");
    values.push(params.eventType);
  }

  if (params.from) {
    conditions.push("a.created_at >= ?");
    values.push(params.from);
  }

  if (params.to) {
    conditions.push("a.created_at <= ?");
    values.push(params.to);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values
  };
};

export const fetchAdminAuditEvents = (params: {
  db: Database.Database;
  whereClause: string;
  values: Array<string | number>;
  limit: number;
  offset: number;
}) => {
  const totalRow = params.db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM audit_log a
        ${params.whereClause}
      `
    )
    .get(...params.values) as { total: number };

  const rows = params.db
    .prepare(
      `
        SELECT
          a.id,
          a.event_type AS eventType,
          a.target_type AS targetType,
          a.target_id AS targetId,
          a.metadata_json AS metadataJson,
          a.created_at AS createdAt,
          a.actor_user_id AS actorUserId,
          u.name AS actorName,
          u.login AS actorLogin
        FROM audit_log a
        LEFT JOIN users u ON u.id = a.actor_user_id
        ${params.whereClause}
        ORDER BY a.created_at DESC
        LIMIT ?
        OFFSET ?
      `
    )
    .all(...params.values, params.limit, params.offset) as AuditRow[];

  return {
    events: rows.map((row) => ({
      id: row.id,
      event_type: row.eventType,
      target_type: row.targetType,
      target_id: row.targetId,
      created_at: row.createdAt,
      actor: row.actorUserId
        ? {
            id: row.actorUserId,
            name: row.actorName,
            login: row.actorLogin
          }
        : null,
      metadata: parseMetadata(row.metadataJson)
    })),
    total: totalRow.total
  };
};
