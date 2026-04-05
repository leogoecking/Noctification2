import { NotificationAlertCenter } from "../NotificationAlertCenter";
import { ReminderAlertCenter } from "../ReminderAlertCenter";
import { ReminderUserPanel } from "../ReminderUserPanel";
import { UserDashboard } from "../UserDashboard";
import { AprPage } from "../../features/apr/AprPage";
import { KmlPostePage } from "../../features/kml-postes/KmlPostePage";
import { TaskUserPanel } from "../../features/tasks";
import { useHoverExpandableSidebar } from "../../hooks/useHoverExpandableSidebar";
import { useNotificationSoundPrefs } from "../../hooks/useNotificationSoundPrefs";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../../lib/featureFlags";
import type { AuthUser } from "../../types";
import type { AppPath } from "./appShellRouting";

interface UserWorkspaceProps {
  currentPath: AppPath;
  currentUser: AuthUser;
  onNavigate: (path: AppPath) => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const SidebarLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-surfaceHigh ring-1 ring-accent/30">
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
  "px-3 text-xs font-semibold tracking-wide text-textMuted/70 uppercase";

const getSidebarDesktopStateClass = (isExpanded: boolean): string =>
  isExpanded ? "lg:w-64 lg:px-4" : "lg:w-20 lg:px-3";

const getSidebarTextClass = (isExpanded: boolean): string =>
  isExpanded
    ? "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-[12rem] lg:opacity-100"
    : "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-0 lg:opacity-0";

const getSidebarSectionTitleVisibilityClass = (isExpanded: boolean): string =>
  isExpanded ? "lg:opacity-100" : "lg:opacity-0";

const SidebarTooltip = ({ isExpanded, label }: { isExpanded: boolean; label: string }) =>
  isExpanded ? null : (
    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-20 hidden -translate-y-1/2 rounded-md border border-outlineSoft/80 bg-panel px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-textMain shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block lg:opacity-0">
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
  `flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition ${
    active
      ? "bg-accent/15 text-accent border-l-2 border-accent"
      : "text-textMuted hover:bg-surfaceHigh hover:text-textMain"
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
  const soundPrefs = useNotificationSoundPrefs();
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
    <section className="grid gap-0 lg:grid-cols-[max-content,1fr]">
      <aside
        className={`hidden border-r border-outlineSoft/40 bg-panel p-4 transition-[width,padding] duration-200 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col ${getSidebarDesktopStateClass(
          isExpanded
        )}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between gap-3">
            <SidebarLogo />
            <button
              aria-label={isPinned ? "Desafixar painel lateral" : "Fixar painel lateral"}
              className="hidden h-8 w-8 items-center justify-center rounded-md border border-outlineSoft/70 bg-panel text-textMuted transition hover:border-accent/40 hover:text-textMain lg:inline-flex"
              onClick={togglePinned}
              title={isPinned ? "Desafixar painel lateral" : "Fixar painel lateral"}
              type="button"
            >
              <IconPin pinned={isPinned} />
            </button>
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

        <div className="mt-6 flex items-center gap-3 rounded-md border border-outlineSoft/40 bg-surfaceHigh px-3 py-3">
          <div
            aria-label={currentUser.name}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent ring-1 ring-accent/35"
          >
            {userInitial}
          </div>
          <div className={`min-w-0 ${getSidebarTextClass(isExpanded)}`}>
            <p className="truncate text-sm font-semibold leading-tight text-textMain">
              {currentUser.name}
            </p>
            <p className="text-xs leading-tight text-textMuted capitalize">{currentUser.role}</p>
          </div>
        </div>
      </aside>

      <div className="space-y-4 p-4">
        <nav className="flex flex-wrap gap-1.5 rounded-md border border-outlineSoft/40 bg-panel p-2 lg:hidden">
          {navigationSections.flatMap((section) => section.items).map((item) => (
            <button
              key={item.path}
              aria-label={item.label}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                currentPath === item.path
                  ? "bg-accent/15 text-accent"
                  : "text-textMuted hover:bg-surfaceHigh hover:text-textMain"
              }`}
              onClick={() => onNavigate(item.path)}
              type="button"
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <NotificationAlertCenter
          isVisible
          onError={onError}
          onToast={onToast}
          onOpenNotifications={() => onNavigate("/notifications")}
          onPlaySound={soundPrefs.playSoundForPriority}
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
            soundPrefs={soundPrefs}
          />
        )}
      </div>
    </section>
  );
};
