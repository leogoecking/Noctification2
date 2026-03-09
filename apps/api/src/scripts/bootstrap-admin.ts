import path from "node:path";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { connectDatabase, nowIso, runMigrations } from "../db";

const FIRST_LOGIN_ADMIN_PASSWORD = "admin";

const run = async () => {
  const db = connectDatabase(config.dbPath);
  runMigrations(db, path.resolve(process.cwd(), "migrations"));

  const login = config.adminSeed.login.trim();
  const password = config.adminSeed.password;
  const name = config.adminSeed.name.trim();

  if (!login || !password || !name) {
    throw new Error("ADMIN_LOGIN, ADMIN_PASSWORD e ADMIN_NAME sao obrigatorios");
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE login = ?")
    .get(login) as { id: number } | undefined;

  const passwordToApply = existing ? password : FIRST_LOGIN_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(passwordToApply, 12);
  const timestamp = nowIso();

  if (existing) {
    db.prepare(
      `
        UPDATE users
        SET name = ?, role = 'admin', is_active = 1, password_hash = ?, updated_at = ?
        WHERE id = ?
      `
    ).run(name, passwordHash, timestamp, existing.id);

    console.log(`Admin atualizado: ${login}`);
  } else {
    db.prepare(
      `
        INSERT INTO users (
          name,
          login,
          password_hash,
          department,
          job_title,
          role,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, '', '', 'admin', 1, ?, ?)
      `
    ).run(name, login, passwordHash, timestamp, timestamp);

    console.log(`Admin criado: ${login} (senha inicial: admin)`);
  }

  db.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
