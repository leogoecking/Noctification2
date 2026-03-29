import { NotificationAlertCenter } from "../NotificationAlertCenter";
import { ReminderAlertCenter } from "../ReminderAlertCenter";
import { ReminderUserPanel } from "../ReminderUserPanel";
import { UserDashboard } from "../UserDashboard";
import { AprPage } from "../../features/apr/AprPage";
import { TaskUserPanel } from "../../features/tasks";
import { isAprModuleEnabled } from "../../lib/featureFlags";
import type { AuthUser } from "../../types";

export type AppPath =
  | "/"
  | "/login"
  | "/admin/login"
  | "/notifications"
  | "/reminders"
  | "/tasks"
  | "/apr";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export const normalizePath = (rawPath: string): AppPath => {
  const aprModuleEnabled = isAprModuleEnabled();

  if (rawPath === "/login") {
    return "/login";
  }

  if (rawPath === "/admin/login") {
    return "/admin/login";
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

  return "/";
};

export const getPageTitle = (
  currentPath: AppPath,
  currentUser: AuthUser | null
): string => {
  if (!currentUser) {
    return currentPath === "/admin/login" ? "Console Administrativo" : "Acesso de Usuario";
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

  if (currentPath === "/apr") {
    return "APR";
  }

  return "Painel Operacional";
};

interface AppHeaderProps {
  currentPath: AppPath;
  currentUser: AuthUser | null;
  pageTitle: string;
  onLogout: () => void;
  onNavigate: (path: AppPath) => void;
}

export const AppHeader = ({
  currentPath,
  currentUser,
  pageTitle,
  onLogout,
  onNavigate
}: AppHeaderProps) => {
  const aprModuleEnabled = isAprModuleEnabled();

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Plataforma interna</p>
        <h1 className="font-display text-2xl text-textMain">{pageTitle}</h1>
      </div>

      {!currentUser && (
        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/login"
                ? "bg-accent text-slate-900"
                : "border border-slate-600 text-textMuted"
            }`}
            onClick={() => onNavigate("/login")}
          >
            /login
          </button>
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/admin/login"
                ? "bg-accent text-slate-900"
                : "border border-slate-600 text-textMuted"
            }`}
            onClick={() => onNavigate("/admin/login")}
          >
            /admin/login
          </button>
        </div>
      )}

      {currentUser && (
        <div className="flex items-center gap-3">
          {currentUser.role === "admin" && aprModuleEnabled && (
            <>
              <button
                className={`rounded-xl px-3 py-2 text-sm ${
                  currentPath === "/"
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMuted"
                }`}
                onClick={() => onNavigate("/")}
                type="button"
              >
                Console
              </button>
              <button
                className={`rounded-xl px-3 py-2 text-sm ${
                  currentPath === "/apr"
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMuted"
                }`}
                onClick={() => onNavigate("/apr")}
                type="button"
              >
                APR
              </button>
            </>
          )}
          <span className="rounded-xl border border-slate-700 bg-panel px-3 py-2 text-sm text-textMuted">
            {currentUser.name} ({currentUser.role})
          </span>
          <button
            className="rounded-xl bg-danger px-3 py-2 text-sm font-semibold text-white"
            onClick={onLogout}
          >
            Sair
          </button>
        </div>
      )}
    </header>
  );
};

interface UserWorkspaceProps {
  currentPath: AppPath;
  currentUser: AuthUser;
  onNavigate: (path: AppPath) => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const USER_NAV_ITEMS: Array<{ label: string; path: AppPath }> = [
  { label: "Painel", path: "/" },
  { label: "Notificacoes", path: "/notifications" },
  { label: "Tarefas", path: "/tasks" },
  { label: "Lembretes", path: "/reminders" }
];

export const UserWorkspace = ({
  currentPath,
  currentUser,
  onNavigate,
  onError,
  onToast
}: UserWorkspaceProps) => {
  const aprModuleEnabled = isAprModuleEnabled();

  return (
    <>
      <nav className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-panel p-2">
        {[...USER_NAV_ITEMS, ...(aprModuleEnabled ? [{ label: "APR", path: "/apr" as AppPath }] : [])].map((item) => (
          <button
            key={item.path}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              currentPath === item.path
                ? "bg-accent text-slate-900"
                : "text-textMuted hover:bg-panelAlt hover:text-textMain"
            }`}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <NotificationAlertCenter
        isVisible
        onError={onError}
        onToast={onToast}
        onOpenNotifications={() => onNavigate("/notifications")}
      />

      <ReminderAlertCenter
        isVisible
        onError={onError}
        onToast={onToast}
        onOpenReminders={() => onNavigate("/reminders")}
      />

      {currentPath === "/tasks" ? (
        <TaskUserPanel user={currentUser} onError={onError} onToast={onToast} />
      ) : currentPath === "/apr" ? (
        <AprPage onError={onError} onToast={onToast} />
      ) : currentPath === "/reminders" ? (
        <ReminderUserPanel onError={onError} onToast={onToast} />
      ) : (
        <UserDashboard
          user={currentUser}
          isNotificationsPage={currentPath === "/notifications"}
          onOpenAllNotifications={() => onNavigate("/notifications")}
          onBackToDashboard={() => onNavigate("/")}
          onError={onError}
          onToast={onToast}
        />
      )}
    </>
  );
};

interface AppToastStackProps {
  toasts: Toast[];
}

export const AppToastStack = ({ toasts }: AppToastStackProps) => (
  <aside className="fixed bottom-4 right-4 z-50 space-y-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`w-80 animate-rise-in rounded-xl border px-4 py-3 text-sm shadow-lg ${
          toast.tone === "ok"
            ? "border-success/40 bg-success/20 text-green-100"
            : "border-danger/40 bg-danger/20 text-red-100"
        }`}
      >
        {toast.message}
      </div>
    ))}
  </aside>
);
