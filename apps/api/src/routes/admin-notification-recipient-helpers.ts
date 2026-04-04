import type Database from "better-sqlite3";
import type { RecipientMode } from "../types";
import type { RecipientUserRow } from "./admin-notification-types";

const SQLITE_MAX_VARIABLES = 900;

export const parseUserIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(normalized));
};

export const fetchActiveUserIds = (db: Database.Database, userIds: number[]): number[] => {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const activeUserIds: number[] = [];

  for (let index = 0; index < uniqueUserIds.length; index += SQLITE_MAX_VARIABLES) {
    const chunk = uniqueUserIds.slice(index, index + SQLITE_MAX_VARIABLES);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
          SELECT id
          FROM users
          WHERE is_active = 1
          AND id IN (${placeholders})
        `
      )
      .all(...chunk) as Array<{ id: number }>;

    for (const row of rows) {
      activeUserIds.push(row.id);
    }
  }

  return Array.from(new Set(activeUserIds));
};

export const resolveNotificationRecipientIds = (
  db: Database.Database,
  recipientMode: RecipientMode,
  requestedRecipientIds: number[]
): number[] => {
  if (recipientMode === "all") {
    const rows = db
      .prepare(
        `
          SELECT id
          FROM users
          WHERE is_active = 1
            AND role = 'user'
        `
      )
      .all() as Array<{ id: number }>;

    return rows.map((row) => row.id);
  }

  return fetchActiveUserIds(db, requestedRecipientIds);
};

export const fetchRecipientUsers = (
  db: Database.Database,
  userIds: number[]
): RecipientUserRow[] => {
  const recipientUsers: RecipientUserRow[] = [];

  for (let index = 0; index < userIds.length; index += SQLITE_MAX_VARIABLES) {
    const chunk = userIds.slice(index, index + SQLITE_MAX_VARIABLES);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
          SELECT id, name, login
          FROM users
          WHERE id IN (${placeholders})
          ORDER BY name ASC
        `
      )
      .all(...chunk) as RecipientUserRow[];

    recipientUsers.push(...rows);
  }

  return recipientUsers;
};
