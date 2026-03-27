import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";

export interface AuthUserRow {
  id: number;
  login: string;
  name: string;
  role: "admin" | "user";
  passwordHash: string;
}

const isSecureCookie = (config: AppConfig): boolean => config.cookieSecure;

export const authCookieOptions = (config: AppConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureCookie(config),
  maxAge: config.jwtExpiresHours * 60 * 60 * 1000
});

export const clearCookieOptions = (config: AppConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureCookie(config)
});

const normalizeRequiredString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const normalizeLogin = (value: unknown): string => normalizeRequiredString(value).toLowerCase();

export const normalizeRegisterPayload = (body: Record<string, unknown> | undefined) => ({
  name: normalizeRequiredString(body?.name),
  login: normalizeLogin(body?.login),
  password: typeof body?.password === "string" ? body.password : ""
});

export const normalizeLoginPayload = (body: Record<string, unknown> | undefined) => ({
  login: normalizeLogin(body?.login),
  password: typeof body?.password === "string" ? body.password : "",
  expectedRole: parseExpectedRole(body?.expected_role ?? body?.expectedRole)
});

export const parseExpectedRole = (value: unknown): "admin" | "user" | null | "invalid" => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value === "admin" || value === "user") {
    return value;
  }

  return "invalid";
};

export const getRoleMismatchMessage = (expectedRole: "admin" | "user"): string => {
  return expectedRole === "admin"
    ? "Use /admin/login para acesso administrativo"
    : "Use /login para acesso de usuario";
};

export const isFixedAdminLogin = (config: AppConfig, login: string): boolean => {
  return login.toLowerCase() === config.adminSeed.login.toLowerCase();
};

export const findActiveUserByLogin = (
  db: Database.Database,
  login: string
): AuthUserRow | undefined =>
  db
    .prepare(
      `
        SELECT id, login, name, role, password_hash AS passwordHash
        FROM users
        WHERE lower(login) = ? AND is_active = 1
      `
    )
    .get(login) as AuthUserRow | undefined;

export const findActiveUserById = (
  db: Database.Database,
  userId: number
): Omit<AuthUserRow, "passwordHash"> | undefined =>
  db
    .prepare(
      `
        SELECT id, login, name, role
        FROM users
        WHERE id = ? AND is_active = 1
      `
    )
    .get(userId) as Omit<AuthUserRow, "passwordHash"> | undefined;

export const loginExists = (db: Database.Database, login: string): boolean => {
  const existing = db.prepare("SELECT id FROM users WHERE lower(login) = ?").get(login) as
    | { id: number }
    | undefined;
  return Boolean(existing);
};

export const verifyUserPassword = async (
  config: AppConfig,
  user: AuthUserRow,
  password: string
): Promise<boolean> => {
  if (isFixedAdminLogin(config, user.login)) {
    return password === config.adminSeed.password;
  }

  return bcrypt.compare(password, user.passwordHash);
};

export const createRegisteredUser = async (
  db: Database.Database,
  params: {
    name: string;
    login: string;
    password: string;
    timestamp: string;
  }
): Promise<number> => {
  const passwordHash = await bcrypt.hash(params.password, 12);
  const result = db
    .prepare(
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
        ) VALUES (?, ?, ?, '', '', 'user', 1, ?, ?)
      `
    )
    .run(params.name, params.login, passwordHash, params.timestamp, params.timestamp);

  return Number(result.lastInsertRowid);
};
