import type { AuthUser, UserRole } from "../types";
import { request } from "./apiCore";

type AuthUserResponse = { user: AuthUser };

export const authApi = {
  register: (name: string, login: string, password: string) =>
    request<AuthUserResponse>("/auth/register", {
      method: "POST",
      bodyJson: { name, login, password }
    }),

  login: (login: string, password: string, expectedRole?: UserRole) =>
    request<AuthUserResponse>("/auth/login", {
      method: "POST",
      bodyJson: {
        login,
        password,
        ...(expectedRole ? { expected_role: expectedRole } : {})
      }
    }),

  me: () => request<AuthUserResponse>("/auth/me"),

  logout: () =>
    request<void>("/auth/logout", {
      method: "POST"
    })
};
