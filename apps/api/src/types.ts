export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type RecipientMode = "all" | "users";
export type NotificationOperationalStatus =
  | "recebida"
  | "visualizada"
  | "em_andamento"
  | "assumida"
  | "resolvida";
export type NotificationResponseStatus = "em_andamento" | "assumida" | "resolvida";

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
