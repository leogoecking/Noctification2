import type Database from "better-sqlite3";
import { FIXED_ADMIN_LOGIN } from "../config";
import type {
  ParsedCreateUserInput,
  ParsedUpdateUserInput,
  UserWriteResult,
  ValidatedCreateUserInput
} from "./admin-user-types";

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
): UserWriteResult<ValidatedCreateUserInput> => {
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

  return {
    ok: true,
    value: {
      name: input.name,
      login: input.login,
      password: input.password,
      department: input.department,
      jobTitle: input.jobTitle,
      role: "user"
    }
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
