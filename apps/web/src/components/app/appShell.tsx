import { NotificationAlertCenter } from "../NotificationAlertCenter";
import { ReminderAlertCenter } from "../ReminderAlertCenter";
import { ReminderUserPanel } from "../ReminderUserPanel";
import { UserDashboard } from "../UserDashboard";
import { AprPage } from "../../features/apr/AprPage";
import { KmlPostePage } from "../../features/kml-postes/KmlPostePage";
import { TaskUserPanel } from "../../features/tasks";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../../lib/featureFlags";
import { useHoverExpandableSidebar } from "../../hooks/useHoverExpandableSidebar";
import type { AuthUser } from "../../types";

export type AppPath =
  | "/"
  | "/login"
  | "/notifications"
  | "/reminders"
  | "/tasks"
  | "/apr"
  | "/kml-postes";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

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

export const getPageTitle = (
  currentPath: AppPath,
  currentUser: AuthUser | null
): string => {
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

interface AppHeaderProps {
  currentUser: AuthUser | null;
  pageTitle: string;
  darkMode: boolean;
  onLogout: () => void;
  onToggleDarkMode: () => void;
}

const ThemeToggle = ({
  darkMode,
  onToggle
}: {
  darkMode: boolean;
  onToggle: () => void;
}) => {
  const label = darkMode ? "Ativar modo claro" : "Ativar modo escuro";
  const trackClass = darkMode ? "bg-surfaceHighest" : "bg-panelAlt";
  const thumbClass = darkMode ? "translate-x-5 bg-textMain" : "translate-x-0 bg-accent";
  const icon = darkMode ? (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-canvas" fill="none" viewBox="0 0 24 24">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" fill="currentColor" />
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

  return (
    <button
      aria-label={label}
      className="flex items-center rounded-full border border-outlineSoft/80 bg-panel px-1 py-1 transition hover:border-accent/40"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <span className="sr-only">{label}</span>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trackClass}`}>
        <span className={`absolute left-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${thumbClass}`}>
          {icon}
        </span>
      </span>
    </button>
  );
};

const UserBadge = ({
  user,
  onLogout
}: {
  user: AuthUser;
  onLogout: () => void;
}) => {
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = user.role === "admin" ? "Admin" : "Usuário";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-outlineSoft/70 bg-panel px-3 py-1.5 shadow-xs">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
          {initial}
        </div>
        <div className="hidden sm:block">
          <p className="max-w-[10rem] truncate text-sm font-semibold leading-tight text-textMain">
            {user.name}
          </p>
          <p className="text-xs leading-tight text-textMuted">{roleLabel}</p>
        </div>
      </div>
      <button
        aria-label="Sair da sessão"
        className="rounded-xl border border-outlineSoft/70 bg-panel px-3 py-2 text-sm font-medium text-textMuted transition hover:border-danger/40 hover:text-danger"
        onClick={onLogout}
        type="button"
      >
        Sair
      </button>
    </div>
  );
};

export const AppHeader = ({
  currentUser,
  pageTitle,
  darkMode,
  onLogout,
  onToggleDarkMode
}: AppHeaderProps) => (
  <header className="sticky top-0 z-30 mb-6 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-outlineSoft/40 bg-canvas/90 px-2 py-2.5 backdrop-blur">
    <div className="flex items-center gap-3">
      <img
        alt="Noctification"
        className="h-7 w-7 shrink-0 opacity-80"
        src="/icons/icon-192.svg"
      />
      <div>
        <h1 className="font-display text-xl font-bold leading-tight text-textMain">
          {pageTitle}
        </h1>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
      {currentUser && (
        <UserBadge user={currentUser} onLogout={onLogout} />
      )}
    </div>
  </header>
);

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

const IconMapPin = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11m0-8.5A2.5 2.5 0 1 0 12 8a2.5 2.5 0 0 0 0 5"
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
  "px-3 text-xs font-bold uppercase tracking-[0.22em] text-textMuted/80";

const getSidebarDesktopStateClass = (isExpanded: boolean): string =>
  isExpanded
    ? "lg:w-64 lg:px-4"
    : "lg:w-20 lg:px-3";

const getSidebarTextClass = (isExpanded: boolean): string =>
  isExpanded
    ? "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-[12rem] lg:opacity-100"
    : "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-0 lg:opacity-0";

const getSidebarSectionTitleVisibilityClass = (isExpanded: boolean): string =>
  isExpanded ? "lg:opacity-100" : "lg:opacity-0";

const SidebarTooltip = ({ isExpanded, label }: { isExpanded: boolean; label: string }) =>
  isExpanded ? null : (
    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-20 hidden -translate-y-1/2 rounded-xl border border-outlineSoft/80 bg-panel px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-textMain shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block lg:opacity-0">
      {label}
    </span>
  );

const IconPin = ({ pinned }: { pinned: boolean }) => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
    <path
      d="M15 3v4l3 3v2h-5v7l-1 2-1-2v-7H6v-2l3-3V3z"
      fill="currentColor"
    />
    {pinned ? <circle cx="18" cy="6" fill="currentColor" r="2.2" /> : null}
  </svg>
);

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
  const { isExpanded, isPinned, onMouseEnter, onMouseLeave, togglePinned } =
    useHoverExpandableSidebar({
      storageKey: "noctification-user-sidebar-pinned"
    });
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();
  const operationItems: UserNavItem[] = [];

  if (aprModuleEnabled) {
    operationItems.push({ label: "APR", path: "/apr", icon: <IconApr /> });
  }

  if (kmlPosteModuleEnabled) {
    operationItems.push({ label: "KML/KMZ", path: "/kml-postes", icon: <IconMapPin /> });
  }

  const navigationSections =
    operationItems.length > 0
      ? [
          ...USER_NAV_ITEMS,
          {
            title: "Operacao",
            items: operationItems
          }
        ]
      : USER_NAV_ITEMS;
  const userInitial = currentUser.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <section className="grid gap-6 lg:grid-cols-[max-content,1fr]">
      <aside
        className={`hidden rounded-[1.75rem] bg-panelAlt p-4 transition-[width,padding] duration-200 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col ${getSidebarDesktopStateClass(
          isExpanded
        )}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="mb-6 px-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <SidebarLogo />
            <div className="flex items-center gap-2">
              <button
                aria-label={isPinned ? "Desafixar painel lateral" : "Fixar painel lateral"}
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-outlineSoft/70 bg-panel text-textMuted transition hover:border-accent/40 hover:text-textMain lg:inline-flex"
                onClick={togglePinned}
                title={isPinned ? "Desafixar painel lateral" : "Fixar painel lateral"}
                type="button"
              >
                <IconPin pinned={isPinned} />
              </button>
              <div
                aria-label={currentUser.name}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-sm font-bold text-textMain ring-1 ring-outlineSoft/70"
              >
                {userInitial}
              </div>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <div>
              <p className={`font-bold text-textMain ${getSidebarTextClass(isExpanded)}`}>Operations</p>
              <p className={`text-xs uppercase tracking-[0.18em] text-textMuted ${getSidebarTextClass(isExpanded)}`}>
                Precision Orchestrator
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 px-2">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p
                className={`${sidebarSectionTitleClass} transition-opacity duration-200 ${getSidebarSectionTitleVisibilityClass(
                  isExpanded
                )}`}
              >
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    aria-label={item.label}
                    key={item.path}
                    className={`${userMenuButtonClass(currentPath === item.path)} group relative`}
                    onClick={() => onNavigate(item.path)}
                    title={!isExpanded ? item.label : undefined}
                    type="button"
                  >
                    <span className="shrink-0 text-textMain">{item.icon}</span>
                    <span className={getSidebarTextClass(isExpanded)}>{item.label}</span>
                    <SidebarTooltip isExpanded={isExpanded} label={item.label} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl bg-panel p-4">
          {isExpanded ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-textMuted">
                Workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-textMain">{currentUser.name}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{currentUser.role}</p>
            </>
          ) : (
            <div className="hidden items-center justify-center lg:flex">
              <div
                aria-label={currentUser.name}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-panelAlt text-sm font-bold text-textMain ring-1 ring-outlineSoft/70"
              >
                {userInitial}
              </div>
            </div>
          )}
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
        ) : currentPath === "/kml-postes" ? (
          <KmlPostePage onError={onError} onToast={onToast} />
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
