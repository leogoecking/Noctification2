import type { NotificationPriority, UserItem } from "../../types";
import type { NotificationFormState, RecipientMode, StateSetter } from "./types";

interface AdminSendPanelProps {
  notificationForm: NotificationFormState;
  setNotificationForm: StateSetter<NotificationFormState>;
  activeUsers: UserItem[];
  loadingUsers: boolean;
  onSend: () => void;
}

export const AdminSendPanel = ({
  notificationForm,
  setNotificationForm,
  activeUsers,
  loadingUsers,
  onSend
}: AdminSendPanelProps) => {
  return (
    <article className="space-y-3 rounded-[1.25rem] bg-panel p-5">
      <h3 className="font-display text-lg text-textMain">Enviar notificacao</h3>

      <input
        className="input"
        placeholder="Titulo"
        value={notificationForm.title}
        onChange={(event) => setNotificationForm((prev) => ({ ...prev, title: event.target.value }))}
      />

      <textarea
        className="input min-h-28"
        placeholder="Mensagem"
        value={notificationForm.message}
        onChange={(event) => setNotificationForm((prev) => ({ ...prev, message: event.target.value }))}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <select
          className="input"
          value={notificationForm.priority}
          onChange={(event) =>
            setNotificationForm((prev) => ({
              ...prev,
              priority: event.target.value as NotificationPriority
            }))
          }
        >
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="critical">Critica</option>
        </select>

        <select
          className="input"
          value={notificationForm.recipient_mode}
          onChange={(event) =>
            setNotificationForm((prev) => ({
              ...prev,
              recipient_mode: event.target.value as RecipientMode,
              recipient_ids: []
            }))
          }
        >
          <option value="all">Todos os usuarios</option>
          <option value="users">Usuarios especificos</option>
        </select>
      </div>

      {notificationForm.recipient_mode === "users" && (
        <div className="max-h-40 space-y-2 overflow-auto rounded-lg bg-panelAlt p-3 ring-1 ring-outlineSoft/50">
          {loadingUsers && <p className="text-xs text-textMuted">Carregando usuarios...</p>}
          {!loadingUsers && activeUsers.length === 0 && (
            <p className="text-xs text-textMuted">Nenhum usuario ativo.</p>
          )}
          {activeUsers.map((item) => {
            const checked = notificationForm.recipient_ids.includes(item.id);
            return (
              <label key={item.id} className="flex items-center gap-2 text-sm text-textMuted">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setNotificationForm((prev) => ({
                      ...prev,
                      recipient_ids: event.target.checked
                        ? [...prev.recipient_ids, item.id]
                        : prev.recipient_ids.filter((value) => value !== item.id)
                    }));
                  }}
                />
                {item.name} ({item.login})
              </label>
            );
          })}
        </div>
      )}

      <button className="btn-accent w-full" onClick={onSend}>
        Enviar notificacao
      </button>
    </article>
  );
};
