import type { Dispatch, SetStateAction } from "react";
import { TaskRecurrenceField } from "../../../components/tasks/TaskRecurrenceField";
import type { TaskPriority, UserItem } from "../../../types";
import type { TaskAdminFormState } from "./adminTasksPanelModel";

interface AdminTaskComposerDialogProps {
  open: boolean;
  form: TaskAdminFormState;
  setForm: Dispatch<SetStateAction<TaskAdminFormState>>;
  users: UserItem[];
  onClose: () => void;
  onSave: () => void;
}

export const AdminTaskComposerDialog = ({
  open,
  form,
  setForm,
  users,
  onClose,
  onSave
}: AdminTaskComposerDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Overlay do formulario administrativo da tarefa"
      className="fixed inset-0 z-40 flex items-center justify-center bg-textMain/70 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        aria-label="Formulario administrativo da tarefa"
        aria-modal="true"
        className="w-full max-w-3xl rounded-[1.25rem] bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-accent">Formulario</p>
              <h4 className="mt-1 font-display text-lg text-textMain">
                {form.id > 0 ? "Editar tarefa" : "Nova tarefa administrativa"}
              </h4>
              <p className="text-sm text-textMuted">Criacao e ajuste de tarefa sem sair da fila.</p>
            </div>
            <button
              aria-label="Fechar formulario administrativo da tarefa"
              className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-xs text-textMain"
              onClick={onClose}
              type="button"
            >
              Fechar
            </button>
          </div>

          <input
            className="input"
            placeholder="Titulo da tarefa"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <textarea
            className="input min-h-24"
            placeholder="Descricao opcional"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="input"
              aria-label="Prioridade da tarefa admin"
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
              }
            >
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
            <input
              className="input"
              aria-label="Prazo da tarefa admin"
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
            />
            <select
              className="input"
              aria-label="Responsavel da tarefa"
              value={form.assigneeUserId}
              onChange={(event) => setForm((prev) => ({ ...prev, assigneeUserId: event.target.value }))}
            >
              <option value="">Sem responsavel</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.login})
                </option>
              ))}
            </select>
          </div>

          <TaskRecurrenceField
            recurrenceAriaLabel="Recorrencia da tarefa admin"
            repeatType={form.repeatType}
            weekdayAriaLabelPrefix="Dia da recorrencia admin"
            weekdays={form.weekdays}
            onRepeatTypeChange={(repeatType) => setForm((prev) => ({ ...prev, repeatType }))}
            onWeekdaysChange={(weekdays) => setForm((prev) => ({ ...prev, weekdays }))}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
              onClick={onClose}
              type="button"
            >
              {form.id > 0 ? "Cancelar edicao" : "Cancelar"}
            </button>
            <button className="btn-primary" onClick={onSave} type="button">
              {form.id > 0 ? "Salvar tarefa" : "Criar tarefa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
