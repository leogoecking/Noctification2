import type { UserItem } from "../../../types";

interface AdminTaskBulkToolbarProps {
  visible: boolean;
  selectedTaskCount: number;
  displayedTaskCount: number;
  bulkSaving: boolean;
  users: UserItem[];
  bulkAssigneeUserId: string;
  setBulkAssigneeUserId: (value: string) => void;
  onToggleSelectAllDisplayed: () => void;
  onClearBulkSelection: () => void;
  onRunBulkStatusUpdate: (status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external") => void;
  onRunBulkComplete: () => void;
  onRunBulkCancel: () => void;
  onRunBulkAssigneeUpdate: () => void;
}

export const AdminTaskBulkToolbar = ({
  visible,
  selectedTaskCount,
  displayedTaskCount,
  bulkSaving,
  users,
  bulkAssigneeUserId,
  setBulkAssigneeUserId,
  onToggleSelectAllDisplayed,
  onClearBulkSelection,
  onRunBulkStatusUpdate,
  onRunBulkComplete,
  onRunBulkCancel,
  onRunBulkAssigneeUpdate
}: AdminTaskBulkToolbarProps) => {
  if (!visible) {
    return null;
  }

  return (
    <article className="sticky top-4 z-10 rounded-[1.25rem] border border-outlineSoft bg-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-textMuted">Selecao em lote</p>
          <h4 className="mt-1 font-display text-sm text-textMain">
            {selectedTaskCount} tarefa(s) selecionada(s)
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
            onClick={onToggleSelectAllDisplayed}
            type="button"
          >
            {selectedTaskCount === displayedTaskCount && displayedTaskCount > 0
              ? "Limpar exibidas"
              : "Selecionar exibidas"}
          </button>
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
            onClick={onClearBulkSelection}
            type="button"
          >
            Limpar selecao
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 disabled:opacity-50"
          disabled={bulkSaving}
          onClick={() => onRunBulkStatusUpdate("assumed")}
          type="button"
        >
          Assumir em lote
        </button>
        <button
          className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning disabled:opacity-50"
          disabled={bulkSaving}
          onClick={() => onRunBulkStatusUpdate("in_progress")}
          type="button"
        >
          Em andamento em lote
        </button>
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
          disabled={bulkSaving}
          onClick={() => onRunBulkStatusUpdate("waiting_external")}
          type="button"
        >
          Aguardar externo em lote
        </button>
        <button
          className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={bulkSaving}
          onClick={onRunBulkComplete}
          type="button"
        >
          Concluir em lote
        </button>
        <button
          className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger disabled:opacity-50"
          disabled={bulkSaving}
          onClick={onRunBulkCancel}
          type="button"
        >
          Cancelar em lote
        </button>
        <select
          aria-label="Responsavel em lote"
          className="input min-w-44"
          disabled={bulkSaving}
          value={bulkAssigneeUserId}
          onChange={(event) => setBulkAssigneeUserId(event.target.value)}
        >
          <option value="">Sem responsavel</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
          disabled={bulkSaving}
          onClick={onRunBulkAssigneeUpdate}
          type="button"
        >
          Aplicar responsavel
        </button>
      </div>
    </article>
  );
};
