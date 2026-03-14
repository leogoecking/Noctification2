import { config } from "../config";
import { connectDatabase } from "../db";

type LoginCollisionRow = {
  normalizedLogin: string;
  count: number;
};

type UserRow = {
  id: number;
  login: string;
  name: string;
  role: "admin" | "user";
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

const run = () => {
  const db = connectDatabase(config.dbPath);

  try {
    const collisions = db
      .prepare(
        `
          SELECT
            lower(login) AS normalizedLogin,
            COUNT(*) AS count
          FROM users
          GROUP BY lower(login)
          HAVING COUNT(*) > 1
          ORDER BY lower(login) ASC
        `
      )
      .all() as LoginCollisionRow[];

    if (collisions.length === 0) {
      console.log("[audit-logins] Nenhuma colisao de login por lowercase encontrada.");
      return;
    }

    console.log(`[audit-logins] ${collisions.length} colisao(oes) encontrada(s):`);

    const fetchUsersByNormalizedLogin = db.prepare(
      `
        SELECT
          id,
          login,
          name,
          role,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE lower(login) = ?
        ORDER BY login ASC, id ASC
      `
    );

    for (const collision of collisions) {
      console.log(`\n- normalizedLogin: ${collision.normalizedLogin} (${collision.count} registros)`);

      const users = fetchUsersByNormalizedLogin.all(collision.normalizedLogin) as UserRow[];
      for (const user of users) {
        console.log(
          [
            `  id=${user.id}`,
            `login=${user.login}`,
            `name=${user.name}`,
            `role=${user.role}`,
            `active=${user.isActive === 1 ? "true" : "false"}`,
            `createdAt=${user.createdAt}`
          ].join(" | ")
        );
      }
    }

    process.exitCode = 2;
  } finally {
    db.close();
  }
};

run();
