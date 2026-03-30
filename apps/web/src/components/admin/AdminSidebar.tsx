import type { AdminMenu } from "./types";

interface AdminSidebarProps {
  menu: AdminMenu;
  onSelect: (menu: AdminMenu) => void;
  aprActive?: boolean;
  aprEnabled?: boolean;
  onOpenApr?: () => void;
  onOpenDashboard?: () => void;
  onLogout?: () => void;
}

const SidebarLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panelAlt ring-1 ring-outlineSoft/60">
    <img alt="Noctification" className="h-7 w-7 object-contain" src="/icons/icon-192.svg" />
  </div>
);

const menuBaseClass =
  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] transition";

const menuButtonClass = (active: boolean): string => {
  return `${menuBaseClass} ${
    active ? "bg-surfaceHighest text-textMain shadow-sm" : "text-textMuted hover:bg-panelAlt"
  }`;
};

const sidebarSectionTitleClass =
  "px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-textMuted/80";

const IconDashboard = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
      fill="currentColor"
    />
  </svg>
);

const IconBell = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22m6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"
      fill="currentColor"
    />
  </svg>
);

const IconUsers = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91M4 13c1.1 0 2-.9 2-2S5.1 9 4 9s-2 .9-2 2 .9 2 2 2m16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3"
      fill="currentColor"
    />
  </svg>
);

const IconChecklist = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"
      fill="currentColor"
    />
  </svg>
);

const IconArchive = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 4h18v4H3zm2 4h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm5 4h4v2h-4z"
      fill="currentColor"
    />
  </svg>
);

const IconPulse = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 13h4l2-5 4 10 2-5h6v-2h-4.8l-1.2 3-4-10-3 7H3z"
      fill="currentColor"
    />
  </svg>
);

const IconClock = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m1 11h-5V7h2v4h3z"
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

export const AdminSidebar = ({
  menu,
  onSelect,
  aprActive = false,
  aprEnabled = false,
  onOpenApr,
  onOpenDashboard,
  onLogout
}: AdminSidebarProps) => {
  const mainItems = [
    { menu: "dashboard" as const, label: "Dashboard", ariaLabel: "Dashboard", icon: <IconDashboard /> },
    {
      menu: "tasks" as const,
      label: "Tarefas",
      ariaLabel: "Tarefas",
      icon: <IconChecklist />
    },
    {
      menu: "reminders" as const,
      label: "Lembretes",
      ariaLabel: "Lembretes",
      icon: <IconClock />
    }
  ];

  const managementItems = [
    {
      menu: "send" as const,
      label: "Enviar notificacao",
      ariaLabel: "Enviar notificacao",
      icon: <IconBell />
    },
    { menu: "users" as const, label: "Usuarios", ariaLabel: "Usuarios", icon: <IconUsers /> },
    {
      menu: "history_notifications" as const,
      label: "Historico",
      ariaLabel: "Historico notificacoes",
      icon: <IconArchive />
    },
    { menu: "audit" as const, label: "Auditoria", ariaLabel: "Auditoria", icon: <IconPulse /> }
  ];

  return (
    <aside className="rounded-[1.75rem] bg-panelAlt p-4 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col">
      <div className="mb-6 px-2">
        <div className="mb-5 flex items-center justify-between gap-3">
          <SidebarLogo />
          <div
            aria-label="Administracao"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-sm font-bold text-textMain ring-1 ring-outlineSoft/70"
          >
            A
          </div>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <div>
            <p className="font-bold text-textMain">Operations</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Precision Orchestrator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 px-2">
        <div className="space-y-2">
          <p className={sidebarSectionTitleClass}>Principal</p>
          <div className="space-y-1">
            {mainItems.map((item) => (
              <button
                aria-label={item.ariaLabel}
                className={menuButtonClass(item.menu === "dashboard" ? !aprActive && menu === "dashboard" : menu === item.menu)}
                key={item.menu}
                onClick={() => {
                  if (item.menu === "dashboard" && onOpenDashboard) {
                    onOpenDashboard();
                    return;
                  }
                  onSelect(item.menu);
                }}
                type="button"
              >
                <span className="text-textMain">{item.icon}</span>
                {item.label}
              </button>
            ))}
            {aprEnabled && onOpenApr ? (
              <button
                aria-label="APR"
                className={menuButtonClass(aprActive)}
                onClick={onOpenApr}
                type="button"
              >
                <span className="text-textMain">
                  <IconApr />
                </span>
                APR
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <p className={sidebarSectionTitleClass}>Operacao</p>
          <div className="space-y-1">
            {managementItems.map((item) => (
              <button
                aria-label={item.ariaLabel}
                className={menuButtonClass(menu === item.menu)}
                key={item.menu}
                onClick={() => onSelect(item.menu)}
                type="button"
              >
                <span className="text-textMain">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-6 rounded-2xl bg-panel p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">Workspace</p>
        <p className="mt-2 text-sm font-semibold text-textMain">Administracao</p>
        <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Console interno</p>
        {onLogout ? (
          <button
            className="mt-4 w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm font-semibold text-textMain"
            onClick={onLogout}
            type="button"
          >
            Sair
          </button>
        ) : null}
      </div>
    </aside>
  );
};
