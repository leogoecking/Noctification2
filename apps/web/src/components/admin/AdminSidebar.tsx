import type { AdminMenu } from "./types";
import { useHoverExpandableSidebar } from "../../hooks/useHoverExpandableSidebar";
import { AdminSidebarSection } from "./AdminSidebarSection";
import {
  getSidebarDesktopStateClass,
  getSidebarTextClass,
  IconApr,
  IconArchive,
  IconBell,
  IconChecklist,
  IconClock,
  IconDashboard,
  IconLogout,
  IconMapPin,
  IconPin,
  IconPulse,
  IconUsers,
  SidebarLogo,
  SidebarTooltip,
  type AdminSidebarNavItem
} from "./adminSidebarUi";

interface AdminSidebarProps {
  menu: AdminMenu;
  onSelect: (menu: AdminMenu) => void;
  aprActive?: boolean;
  aprEnabled?: boolean;
  kmlPosteActive?: boolean;
  kmlPosteEnabled?: boolean;
  onOpenApr?: () => void;
  onOpenKmlPostes?: () => void;
  onOpenDashboard?: () => void;
  onLogout?: () => void;
}

export const AdminSidebar = ({
  menu,
  onSelect,
  aprActive = false,
  aprEnabled = false,
  kmlPosteActive = false,
  kmlPosteEnabled = false,
  onOpenApr,
  onOpenKmlPostes,
  onOpenDashboard,
  onLogout
}: AdminSidebarProps) => {
  const { isExpanded, isPinned, onMouseEnter, onMouseLeave, togglePinned } =
    useHoverExpandableSidebar({
      storageKey: "noctification-admin-sidebar-pinned"
    });
  const mainItems: AdminSidebarNavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      ariaLabel: "Dashboard",
      active: !aprActive && !kmlPosteActive && menu === "dashboard",
      icon: <IconDashboard />,
      onClick: onOpenDashboard ?? (() => onSelect("dashboard"))
    },
    {
      key: "tasks",
      label: "Tarefas",
      ariaLabel: "Tarefas",
      active: menu === "tasks",
      icon: <IconChecklist />,
      onClick: () => onSelect("tasks")
    },
    {
      key: "reminders",
      label: "Lembretes",
      ariaLabel: "Lembretes",
      active: menu === "reminders",
      icon: <IconClock />,
      onClick: () => onSelect("reminders")
    }
  ];

  if (aprEnabled && onOpenApr) {
    mainItems.push({
      key: "apr",
      label: "APR",
      ariaLabel: "APR",
      active: aprActive,
      icon: <IconApr />,
      onClick: onOpenApr
    });
  }

  if (kmlPosteEnabled && onOpenKmlPostes) {
    mainItems.push({
      key: "kml-postes",
      label: "KML/KMZ",
      ariaLabel: "KML/KMZ",
      active: kmlPosteActive,
      icon: <IconMapPin />,
      onClick: onOpenKmlPostes
    });
  }

  const managementItems: AdminSidebarNavItem[] = [
    {
      key: "send",
      label: "Enviar notificacao",
      ariaLabel: "Enviar notificacao",
      active: menu === "send",
      icon: <IconBell />,
      onClick: () => onSelect("send")
    },
    {
      key: "users",
      label: "Usuarios",
      ariaLabel: "Usuarios",
      active: menu === "users",
      icon: <IconUsers />,
      onClick: () => onSelect("users")
    },
    {
      key: "history_notifications",
      label: "Historico",
      ariaLabel: "Historico notificacoes",
      active: menu === "history_notifications",
      icon: <IconArchive />,
      onClick: () => onSelect("history_notifications")
    },
    {
      key: "audit",
      label: "Auditoria",
      ariaLabel: "Auditoria",
      active: menu === "audit",
      icon: <IconPulse />,
      onClick: () => onSelect("audit")
    }
  ];

  return (
    <aside
      className={`border-r border-outlineSoft/40 bg-panel p-4 transition-[width,padding] duration-200 lg:flex lg:min-h-[calc(100vh-8rem)] lg:flex-col ${getSidebarDesktopStateClass(
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
        <AdminSidebarSection isExpanded={isExpanded} items={mainItems} title="Principal" />
        <AdminSidebarSection isExpanded={isExpanded} items={managementItems} title="Operacao" />
      </nav>

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-3 rounded-md border border-outlineSoft/40 bg-surfaceHigh px-3 py-3">
          <div
            aria-label="Administração"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent ring-1 ring-accent/35"
          >
            A
          </div>
          <div className={`min-w-0 ${getSidebarTextClass(isExpanded)}`}>
            <p className="truncate text-sm font-semibold leading-tight text-textMain">Administração</p>
            <p className="text-xs leading-tight text-textMuted">Console interno</p>
          </div>
        </div>
        {onLogout ? (
          <button
            className="group relative flex w-full items-center justify-center gap-3 rounded-md border border-outlineSoft/50 bg-surfaceHigh px-3 py-2.5 text-sm font-medium text-textMuted transition hover:border-danger/40 hover:text-danger"
            onClick={onLogout}
            title={!isExpanded ? "Sair" : undefined}
            type="button"
          >
            <span className="shrink-0"><IconLogout /></span>
            <span className={getSidebarTextClass(isExpanded)}>Sair</span>
            <SidebarTooltip isExpanded={isExpanded} label="Sair" />
          </button>
        ) : null}
      </div>
    </aside>
  );
};
