export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type RecipientMode = "all" | "users";
export type NotificationResponseStatus = "em_andamento" | "resolvido";

export interface AuthUser {
  id: number;
  login: string;
  name: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: number;
  role: UserRole;
}
