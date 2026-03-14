import bcrypt from "bcryptjs";
import { config } from "../config";
import { connectDatabase, nowIso, runMigrations } from "../db";
import { apiMigrationsDir } from "../paths";

const run = async () => {
  const db = connectDatabase(config.dbPath);
  runMigrations(db, apiMigrationsDir);

  const login = config.adminSeed.login.trim().toLowerCase();
  const password = config.adminSeed.password;
  const name = config.adminSeed.name.trim();

  if (!login || !password || !name) {
    throw new Error("Configuracao do admin fixo invalida");
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE lower(login) = ?")
    .get(login) as { id: number } | undefined;

  const passwordHash = await bcrypt.hash(password, 12);
  const timestamp = nowIso();

  if (existing) {
    db.prepare(
      `
        UPDATE users
        SET name = ?, role = 'admin', is_active = 1, password_hash = ?, updated_at = ?
        WHERE id = ?
      `
    ).run(name, passwordHash, timestamp, existing.id);

    console.log(`Admin fixo atualizado: ${login}`);
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

    console.log(`Admin fixo criado: ${login}`);
  }

  db.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
