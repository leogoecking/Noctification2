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

export interface ParsedCreateUserInput {
  name: string | null;
  login: string | null;
  password: string | null;
  department: string;
  jobTitle: string;
  roleValue: unknown;
}

export interface ValidatedCreateUserInput {
  name: string;
  login: string;
  password: string;
  department: string;
  jobTitle: string;
  role: UserRole;
}

export interface ParsedUpdateUserInput {
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

export type UserWriteResult<T> = UserWriteSuccess<T> | UserWriteFailure;
