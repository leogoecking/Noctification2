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

  if (currentPath === "/apr") {
    return "APR";
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

interface AppHeaderProps {
  currentPath: AppPath;
  currentUser: AuthUser | null;
  pageTitle: string;
  darkMode: boolean;
  onLogout: () => void;
  onNavigate: (path: AppPath) => void;
  onToggleDarkMode: () => void;
}

export const AppHeader = ({
  currentPath,
  currentUser,
  pageTitle,
  darkMode,
  onLogout,
  onNavigate,
  onToggleDarkMode
}: AppHeaderProps) => {
  const themeToggleLabel = darkMode ? "Ativar modo claro" : "Ativar modo escuro";
  const themeToggleTrackClass = darkMode
    ? "bg-surfaceHighest"
    : "bg-panelAlt";
  const themeToggleThumbClass = darkMode ? "translate-x-5 bg-textMain" : "translate-x-0 bg-accent";
  const themeToggleIcon = darkMode ? (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 text-canvas"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 text-white"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );

  const themeToggleButton = (
    <button
      aria-label={themeToggleLabel}
      className="flex items-center rounded-full border border-outlineSoft/80 bg-panel px-1 py-1 transition hover:border-accent/40"
      onClick={onToggleDarkMode}
      title={themeToggleLabel}
      type="button"
    >
      <span className="sr-only">{themeToggleLabel}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${themeToggleTrackClass}`}
      >
        <span
          className={`absolute left-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${themeToggleThumbClass}`}
        >
          {themeToggleIcon}
        </span>
      </span>
    </button>
  );

  return (
    <header className="sticky top-0 z-30 mb-6 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-outlineSoft/50 bg-canvas/90 px-2 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-textMuted">Plataforma interna</p>
          <h1 className="font-display text-2xl font-extrabold text-textMain">{pageTitle}</h1>
        </div>
      </div>

      {!currentUser && (
        <div className="flex items-center gap-2">
          {themeToggleButton}
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/login"
                ? "bg-surfaceHighest text-textMain"
                : "border border-outlineSoft text-textMuted"
            }`}
            onClick={() => onNavigate("/login")}
          >
            /login
          </button>
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/admin/login"
                ? "bg-surfaceHighest text-textMain"
                : "border border-outlineSoft text-textMuted"
            }`}
            onClick={() => onNavigate("/admin/login")}
          >
            /admin/login
          </button>
        </div>
      )}

      {currentUser && (
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMuted">
            {currentUser.name} ({currentUser.role})
          </span>
          {themeToggleButton}
          {currentUser.role !== "admin" ? (
            <button
              className="rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm font-semibold text-textMain"
              onClick={onLogout}
            >
              Sair
            </button>
          ) : null}
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

const SidebarLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panelAlt ring-1 ring-outlineSoft/60">
    <img alt="Noctification" className="h-7 w-7 object-contain" src="/icons/icon-192.svg" />
  </div>
);

const IconDashboard = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
      fill="currentColor"
    />
  </svg>
);

const IconNotification = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22m6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"
      fill="currentColor"
    />
  </svg>
);

const IconTasks = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"
      fill="currentColor"
    />
  </svg>
);

const IconReminder = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm-6-6h-2v-2h2zm4 0h-2v-2h2zm-8 4H7v-2h2z"
      fill="currentColor"
    />
  </svg>
);

const IconApr = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm0 4 4 1.5V11c0 3.2-1.9 6.3-4 7.5-2.1-1.2-4-4.3-4-7.5V7.5zm-1 3v5l4-2.5z"
      fill="currentColor"
    />
  </svg>
);

type UserNavItem = {
  label: string;
  path: AppPath;
  icon: JSX.Element;
};

const USER_NAV_ITEMS: Array<{ title: string; items: UserNavItem[] }> = [
  {
    title: "Principal",
    items: [
      { label: "Painel", path: "/", icon: <IconDashboard /> },
      { label: "Notificacoes", path: "/notifications", icon: <IconNotification /> },
      { label: "Tarefas", path: "/tasks", icon: <IconTasks /> },
      { label: "Lembretes", path: "/reminders", icon: <IconReminder /> }
    ]
  }
];

const sidebarSectionTitleClass =
  "px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-textMuted/80";

const userMenuButtonClass = (active: boolean): string =>
  `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] transition ${
    active
      ? "bg-surfaceHighest text-textMain shadow-sm"
      : "text-textMuted hover:bg-panelAlt hover:text-textMain"
  }`;

export const UserWorkspace = ({
  currentPath,
  currentUser,
  onNavigate,
  onError,
  onToast
}: UserWorkspaceProps) => {
  const aprModuleEnabled = isAprModuleEnabled();
  const navigationSections = aprModuleEnabled
    ? [
        ...USER_NAV_ITEMS,
        {
          title: "Operacao",
          items: [{ label: "APR", path: "/apr" as AppPath, icon: <IconApr /> }]
        }
      ]
    : USER_NAV_ITEMS;
  const userInitial = currentUser.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <section className="grid gap-6 lg:grid-cols-[15rem,1fr]">
      <aside className="hidden rounded-[1.75rem] bg-panelAlt p-4 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col">
        <div className="mb-6 px-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <SidebarLogo />
            <div
              aria-label={currentUser.name}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-sm font-bold text-textMain ring-1 ring-outlineSoft/70"
            >
              {userInitial}
            </div>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <div>
              <p className="font-bold text-textMain">Operations</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">
                Precision Orchestrator
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 px-2">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className={sidebarSectionTitleClass}>{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    aria-label={item.label}
                    key={item.path}
                    className={userMenuButtonClass(currentPath === item.path)}
                    onClick={() => onNavigate(item.path)}
                    type="button"
                  >
                    <span className="text-textMain">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl bg-panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
            Workspace
          </p>
          <p className="mt-2 text-sm font-semibold text-textMain">{currentUser.name}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{currentUser.role}</p>
        </div>
      </aside>

      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2 rounded-[1.5rem] bg-panelAlt p-2 lg:hidden">
          {navigationSections.flatMap((section) => section.items).map((item) => (
            <button
              key={item.path}
              className={`rounded-xl px-4 py-2 text-sm transition ${
                currentPath === item.path
                  ? "bg-surfaceHighest text-textMain"
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
            onOpenTasks={() => onNavigate("/tasks")}
            onOpenReminders={() => onNavigate("/reminders")}
            onError={onError}
            onToast={onToast}
          />
        )}
      </div>
    </section>
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
            ? "border-success/25 bg-success/12 text-textMain"
            : "border-danger/25 bg-danger/12 text-textMain"
        }`}
      >
        {toast.message}
      </div>
    ))}
  </aside>
);
