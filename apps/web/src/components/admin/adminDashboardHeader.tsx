import { AdminOnlineUsersTrigger } from "./adminOverviewSections";
import type { AdminMenu, OnlineSummary } from "./types";
import type { OnlineUserItem } from "../../types";

const getAdminHeaderCopy = (
  menu: AdminMenu,
  isSearching: boolean,
  isAprPage: boolean,
  isKmlPostePage: boolean
): { title: string; subtitle: string; chip: string } => {
  if (isSearching) {
    return {
      title: "Busca global",
      subtitle: "Resultados unificados de tarefas, usuarios, notificacoes e auditoria.",
      chip: "Pesquisa"
    };
  }

  if (isAprPage) {
    return {
      title: "APR",
      subtitle: "Workspace isolado para conferencia mensal e operacao da base APR.",
      chip: "Modulo"
    };
  }

  if (isKmlPostePage) {
    return {
      title: "KML/KMZ",
      subtitle: "Padronizacao operacional de postes com upload e exportacao de artefatos.",
      chip: "Modulo"
    };
  }

  switch (menu) {
    case "tasks":
      return {
        title: "Tarefas",
        subtitle: "Fila administrativa de tarefas, acompanhamentos e comentarios.",
        chip: "Operacao"
      };
    case "reminders":
      return {
        title: "Lembretes",
        subtitle: "Monitoramento e operacao dos lembretes ativos e ocorrencias.",
        chip: "Operacao"
      };
    case "send":
      return {
        title: "Envio de notificacoes",
        subtitle: "Disparo controlado para usuarios ativos sem sair do console.",
        chip: "Acao"
      };
    case "users":
      return {
        title: "Usuarios",
        subtitle: "Gestao de contas, permissoes e status operacional.",
        chip: "Gestao"
      };
    case "history_notifications":
      return {
        title: "Historico",
        subtitle: "Consulta de notificacoes entregues, respondidas e encerradas.",
        chip: "Consulta"
      };
    case "audit":
      return {
        title: "Auditoria",
        subtitle: "Eventos administrativos recentes e trilha de acao do sistema.",
        chip: "Consulta"
      };
    case "dashboard":
    default:
      return {
        title: "Dashboard operacional",
        subtitle: "Visao rapida das pendencias, saude do sistema e atividade recente.",
        chip: "Resumo"
      };
  }
};

interface AdminDashboardHeaderProps {
  menu: AdminMenu;
  isSearching: boolean;
  isAprPage: boolean;
  isKmlPostePage: boolean;
  globalSearchEnabled: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onlineUsers: OnlineUserItem[];
  onlineSummary: OnlineSummary;
  lastOnlineRefreshAt: string | null;
  loadingOnlineUsers: boolean;
  onRefreshOnlineUsers: () => void;
}

export const AdminDashboardHeader = ({
  menu,
  isSearching,
  isAprPage,
  isKmlPostePage,
  globalSearchEnabled,
  searchQuery,
  setSearchQuery,
  onlineUsers,
  onlineSummary,
  lastOnlineRefreshAt,
  loadingOnlineUsers,
  onRefreshOnlineUsers
}: AdminDashboardHeaderProps) => {
  const headerCopy = getAdminHeaderCopy(menu, isSearching, isAprPage, isKmlPostePage);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-panel px-5 py-4 shadow-xs">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {headerCopy.chip}
          </span>
          <span className="rounded-md bg-panelAlt px-2 py-0.5 text-xs font-medium text-textMuted">
            Admin
          </span>
        </div>
        <h3 className="font-display text-xl font-bold text-textMain">{headerCopy.title}</h3>
        <p className="mt-0.5 max-w-3xl text-sm text-textMuted">{headerCopy.subtitle}</p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 lg:max-w-2xl">
        {globalSearchEnabled ? (
          <label className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-xl border border-outlineSoft/60 bg-panelAlt px-3 py-2 text-sm">
            <svg
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-textMuted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              aria-label="Busca global do admin"
              className="min-w-0 flex-1 bg-transparent text-sm text-textMain outline-none placeholder:text-textMuted"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar tarefas, usuários, notificações..."
              type="search"
              value={searchQuery}
            />
          </label>
        ) : null}
        <AdminOnlineUsersTrigger
          onlineUsers={onlineUsers}
          onlineSummary={onlineSummary}
          lastOnlineRefreshAt={lastOnlineRefreshAt}
          loadingOnlineUsers={loadingOnlineUsers}
          onRefreshOnlineUsers={onRefreshOnlineUsers}
        />
      </div>
    </header>
  );
};
