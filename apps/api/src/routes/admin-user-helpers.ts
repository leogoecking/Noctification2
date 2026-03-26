import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import { FIXED_ADMIN_LOGIN } from "../config";
import { nowIso } from "../db";
import type { UserRole } from "../types";

export interface UserRow {
  id: number;
  name: string;
  login: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface ParsedCreateUserInput {
  name: string | null;
  login: string | null;
  password: string | null;
  department: string;
  jobTitle: string;
  roleValue: unknown;
}

interface ParsedUpdateUserInput {
  name: string | null;
  login: string | null;
  department: string | null;
  jobTitle: string | null;
  role: unknown;
  password: string | null;
}

interface UserWriteSuccess<T> {
  ok: true;
  value: T;
}

interface UserWriteFailure {
  ok: false;
  status: number;
  error: string;
}

type UserWriteResult<T> = UserWriteSuccess<T> | UserWriteFailure;

export const isFixedAdminLogin = (login: string): boolean =>
  login.toLowerCase() === FIXED_ADMIN_LOGIN;

export const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const toNormalizedLogin = (value: unknown): string | null => {
  const normalized = toNullableString(value);
  return normalized ? normalized.toLowerCase() : null;
};

export const isUniqueLoginConstraintError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("unique constraint failed") && message.includes("users.login");
};

export const parseCreateUserInput = (
  body: Record<string, unknown> | undefined
): ParsedCreateUserInput => ({
  name: toNullableString(body?.name),
  login: toNormalizedLogin(body?.login),
  password: toNullableString(body?.password),
  department: toNullableString(body?.department) ?? "",
  jobTitle: toNullableString(body?.job_title) ?? "",
  roleValue: body?.role
});

export const validateCreateUserInput = (
  db: Database.Database,
  input: ParsedCreateUserInput
): UserWriteResult<{
  name: string;
  login: string;
  password: string;
  department: string;
  jobTitle: string;
  role: UserRole;
}> => {
  let role: UserRole = "user";

  if (input.roleValue !== undefined) {
    if (input.roleValue !== "admin" && input.roleValue !== "user") {
      return { ok: false, status: 400, error: "role deve ser admin ou user" };
    }

    if (input.roleValue === "admin") {
      return { ok: false, status: 400, error: "Apenas o admin fixo e permitido" };
    }
  }

  if (!input.name || !input.login || !input.password) {
    return {
      ok: false,
      status: 400,
      error: "name, login e password sao obrigatorios"
    };
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE lower(login) = ?")
    .get(input.login) as { id: number } | undefined;

  if (existing) {
    return { ok: false, status: 409, error: "Login ja existente" };
  }

  role = "user";

  return {
    ok: true,
    value: {
      name: input.name,
      login: input.login,
      password: input.password,
      department: input.department,
      jobTitle: input.jobTitle,
      role
    }
  };
};

export const createUserRecord = async (
  db: Database.Database,
  params: {
    name: string;
    login: string;
    password: string;
    department: string;
    jobTitle: string;
    role: UserRole;
  }
): Promise<UserWriteResult<{ created: UserRow; userId: number }>> => {
  const hashedPassword = await bcrypt.hash(params.password, 12);
  const timestamp = nowIso();

  let result: { lastInsertRowid: number | bigint };

  try {
    result = db
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
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `
      )
      .run(
        params.name,
        params.login,
        hashedPassword,
        params.department,
        params.jobTitle,
        params.role,
        timestamp,
        timestamp
      );
  } catch (error) {
    if (isUniqueLoginConstraintError(error)) {
      return { ok: false, status: 409, error: "Login ja existente" };
    }

    throw error;
  }

  const userId = Number(result.lastInsertRowid);
  const created = db
    .prepare(
      `
        SELECT
          id,
          name,
          login,
          department,
          job_title AS jobTitle,
          role,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE id = ?
      `
    )
    .get(userId) as UserRow;

  return {
    ok: true,
    value: { created, userId }
  };
};

export const parseUpdateUserInput = (
  body: Record<string, unknown> | undefined
): ParsedUpdateUserInput => ({
  name: toNullableString(body?.name),
  login: toNormalizedLogin(body?.login),
  department: toNullableString(body?.department),
  jobTitle: toNullableString(body?.job_title),
  role: body?.role,
  password: toNullableString(body?.password)
});

export const buildUserUpdate = async (
  db: Database.Database,
  params: {
    userId: number;
    targetLogin: string;
    body: Record<string, unknown> | undefined;
  }
): Promise<UserWriteResult<{ updates: string[]; values: Array<string | number> }>> => {
  const fixedAdminUser = isFixedAdminLogin(params.targetLogin);
  const input = parseUpdateUserInput(params.body);
  const updates: string[] = [];
  const values: Array<string | number> = [];

  if (input.name) {
    updates.push("name = ?");
    values.push(input.name);
  }

  if (input.login) {
    if (fixedAdminUser && !isFixedAdminLogin(input.login)) {
      return {
        ok: false,
        status: 400,
        error: "Login do admin fixo nao pode ser alterado"
      };
    }

    if (!fixedAdminUser && isFixedAdminLogin(input.login)) {
      return {
        ok: false,
        status: 400,
        error: "Login reservado para administrador"
      };
    }

    const conflictingUser = db
      .prepare("SELECT id FROM users WHERE lower(login) = ? AND id != ?")
      .get(input.login, params.userId) as { id: number } | undefined;

    if (conflictingUser) {
      return { ok: false, status: 409, error: "Login ja existente" };
    }

    updates.push("login = ?");
    values.push(input.login);
  }

  if (input.department !== null) {
    updates.push("department = ?");
    values.push(input.department);
  }

  if (input.jobTitle !== null) {
    updates.push("job_title = ?");
    values.push(input.jobTitle);
  }

  if (input.role !== undefined) {
    if (input.role !== "admin" && input.role !== "user") {
      return { ok: false, status: 400, error: "role deve ser admin ou user" };
    }

    if (fixedAdminUser && input.role !== "admin") {
      return {
        ok: false,
        status: 400,
        error: "Role do admin fixo nao pode ser alterado"
      };
    }

    if (!fixedAdminUser && input.role === "admin") {
      return {
        ok: false,
        status: 400,
        error: "Apenas o admin fixo e permitido"
      };
    }

    updates.push("role = ?");
    values.push(input.role);
  }

  if (input.password) {
    if (fixedAdminUser) {
      return {
        ok: false,
        status: 400,
        error: "Senha do admin fixo nao pode ser alterada"
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    updates.push("password_hash = ?");
    values.push(hashedPassword);
  }

  if (updates.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Nenhum campo valido para atualizar"
    };
  }

  updates.push("updated_at = ?");
  values.push(nowIso());

  return {
    ok: true,
    value: {
      updates,
      values
    }
  };
};

export const updateUserRecord = (
  db: Database.Database,
  params: {
    userId: number;
    updates: string[];
    values: Array<string | number>;
  }
): UserWriteResult<{ updated: UserRow }> => {
  let result: { changes: number };

  try {
    result = db
      .prepare(`UPDATE users SET ${params.updates.join(", ")} WHERE id = ?`)
      .run(...params.values, params.userId);
  } catch (error) {
    if (isUniqueLoginConstraintError(error)) {
      return { ok: false, status: 409, error: "Login ja existente" };
    }

    throw error;
  }

  if (result.changes === 0) {
    return { ok: false, status: 404, error: "Usuario nao encontrado" };
  }

  const updated = db
    .prepare(
      `
        SELECT
          id,
          name,
          login,
          department,
          job_title AS jobTitle,
          role,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE id = ?
      `
    )
    .get(params.userId) as UserRow;

  return {
    ok: true,
    value: { updated }
  };
};
