import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../../lib/featureFlags";
import type { AuthUser } from "../../types";

export type AppPath =
  | "/"
  | "/login"
  | "/notifications"
  | "/reminders"
  | "/tasks"
  | "/apr"
  | "/kml-postes";

export const normalizePath = (rawPath: string): AppPath => {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();

  if (rawPath === "/login") {
    return "/login";
  }

  if (rawPath === "/notifications") {
    return "/notifications";
  }

  if (rawPath === "/reminders") {
    return "/reminders";
  }

  if (rawPath === "/tasks") {
    return "/tasks";
  }

  if (rawPath === "/apr" && aprModuleEnabled) {
    return "/apr";
  }

  if (rawPath === "/kml-postes" && kmlPosteModuleEnabled) {
    return "/kml-postes";
  }

  return "/";
};

export const getPageTitle = (currentPath: AppPath, currentUser: AuthUser | null): string => {
  if (!currentUser) {
    return "Acesso interno";
  }

  if (currentPath === "/apr") {
    return "APR";
  }

  if (currentPath === "/kml-postes") {
    return "Padronizador KML/KMZ";
  }

  if (currentUser.role === "admin") {
    return "Console Administrativo";
  }

  if (currentPath === "/notifications") {
    return "Todas as Notificacoes";
  }

  if (currentPath === "/reminders") {
    return "Lembretes";
  }

  if (currentPath === "/tasks") {
    return "Tarefas";
  }

  return "Painel Operacional";
};
