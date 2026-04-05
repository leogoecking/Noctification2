import { useState } from "react";
import type { OnlineUserItem } from "../../types";
import type { OnlineSummary } from "./types";
import { formatDate } from "./utils";

interface AdminOverviewOnlineUsersProps {
  onlineUsers: OnlineUserItem[];
  onlineSummary: OnlineSummary;
  lastOnlineRefreshAt: string | null;
  loadingOnlineUsers: boolean;
  onRefreshOnlineUsers: () => void;
}

export const AdminOnlineUsersTrigger = ({
  onlineUsers,
  onlineSummary,
  lastOnlineRefreshAt,
  loadingOnlineUsers,
  onRefreshOnlineUsers
}: AdminOverviewOnlineUsersProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Usuarios online"
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-outlineSoft bg-panelAlt text-textMain transition hover:border-accent/40"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path
            d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4ZM8 14c-.29 0-.62.02-.97.05C4.64 14.25 1 15.43 1 18v2h5v-2c0-1.55.8-2.89 2.18-3.93A8.7 8.7 0 0 0 8 14Z"
            fill="currentColor"
          />
        </svg>
        <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-success px-1.5 text-xs font-bold text-black">
          {loadingOnlineUsers ? "..." : onlineUsers.length}
        </span>
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-panel p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
                  Presenca online
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
                  Usuarios conectados agora
                </h3>
                <p className="mt-2 text-sm text-textMuted">
                  {onlineUsers.length} online. Atualizado em {formatDate(lastOnlineRefreshAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                  onClick={onRefreshOnlineUsers}
                  type="button"
                >
                  Atualizar
                </button>
                <button
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-xs uppercase tracking-wider text-textMuted">Total online</p>
                <p className="mt-2 text-xl font-bold text-success">{onlineUsers.length}</p>
              </div>
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-xs uppercase tracking-wider text-textMuted">Usuarios</p>
                <p className="mt-2 text-xl font-bold text-accent">{onlineSummary.operators}</p>
              </div>
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-xs uppercase tracking-wider text-textMuted">Admins</p>
                <p className="mt-2 text-xl font-bold text-textMain">{onlineSummary.admins}</p>
              </div>
            </div>

            {loadingOnlineUsers ? <p className="mt-4 text-sm text-textMuted">Carregando...</p> : null}
            {!loadingOnlineUsers && onlineUsers.length === 0 ? (
              <p className="mt-4 text-sm text-textMuted">Nenhum usuario online no momento.</p>
            ) : null}

            <div className="mt-5 space-y-3">
              {onlineUsers.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-panelAlt p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-textMain">{item.name}</p>
                    <p className="text-xs text-textMuted">
                      {item.login} | {item.department || "Sem setor"} | {item.jobTitle || "Sem funcao"}
                    </p>
                  </div>
                  <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                    {item.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
