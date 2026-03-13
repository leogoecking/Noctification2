import type { AdminMenu } from "./types";

interface AdminSidebarProps {
  menu: AdminMenu;
  onSelect: (menu: AdminMenu) => void;
}

const menuBaseClass =
  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition";

const menuButtonClass = (active: boolean): string => {
  return `${menuBaseClass} ${
    active ? "bg-accent text-slate-900" : "text-textMuted hover:bg-panelAlt"
  }`;
};

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="4" rx="1" />
    <rect x="14" y="10" width="7" height="11" rx="1" />
    <rect x="3" y="13" width="7" height="8" rx="1" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <path d="M20 8v6" />
    <path d="M23 11h-6" />
  </svg>
);

const IconArchive = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const IconPulse = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export const AdminSidebar = ({ menu, onSelect }: AdminSidebarProps) => {
  return (
    <aside className="rounded-2xl border border-slate-700 bg-panel p-3 shadow-glow lg:sticky lg:top-4 lg:h-fit">
      <h2 className="mb-1 font-display text-lg text-textMain">Admin</h2>
      <p className="mb-3 text-xs text-textMuted">Menu executivo</p>

      <nav className="space-y-1">
        <button className={menuButtonClass(menu === "dashboard")} onClick={() => onSelect("dashboard")}>
          <IconDashboard />
          Dashboard
        </button>

        <button className={menuButtonClass(menu === "send")} onClick={() => onSelect("send")}>
          <IconBell />
          Enviar notificacao
        </button>

        <button className={menuButtonClass(menu === "users")} onClick={() => onSelect("users")}>
          <IconUsers />
          Usuarios
        </button>

        <button
          className={menuButtonClass(menu === "history_notifications")}
          onClick={() => onSelect("history_notifications")}
        >
          <IconArchive />
          Historico notificacoes
        </button>

        <button className={menuButtonClass(menu === "audit")} onClick={() => onSelect("audit")}>
          <IconPulse />
          Auditoria
        </button>

        <button className={menuButtonClass(menu === "reminders")} onClick={() => onSelect("reminders")}>
          <IconClock />
          Lembretes
        </button>
      </nav>
    </aside>
  );
};
