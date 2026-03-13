import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { apiRootDir } from "./paths";

export const nowIso = (): string => new Date().toISOString();

export const resolveDbPath = (rawPath: string): string => {
  if (rawPath === ":memory:") {
    return rawPath;
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(apiRootDir, rawPath);
};

export const connectDatabase = (dbPath: string): Database.Database => {
  const absolutePath = resolveDbPath(dbPath);

  if (absolutePath !== ":memory:") {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  }

  const db = new Database(absolutePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
};

export const runMigrations = (db: Database.Database, migrationsDir: string): void => {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const hasMigration = db.prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
  const registerMigration = db.prepare(
    "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)"
  );

  for (const file of files) {
    const alreadyApplied = hasMigration.get(file);
    if (alreadyApplied) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      registerMigration.run(file, nowIso());
    });

    apply();
  }
};

export const sanitizeMetadata = (metadata?: Record<string, unknown>): string | null => {
  if (!metadata) {
    return null;
  }

  return JSON.stringify(metadata);
};

export const logAudit = (
  db: Database.Database,
  params: {
    actorUserId?: number;
    eventType: string;
    targetType: string;
    targetId?: number;
    metadata?: Record<string, unknown>;
  }
): void => {
  db.prepare(
    `
      INSERT INTO audit_log (
        actor_user_id,
        event_type,
        target_type,
        target_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.actorUserId ?? null,
    params.eventType,
    params.targetType,
    params.targetId ?? null,
    sanitizeMetadata(params.metadata),
    nowIso()
  );
};
