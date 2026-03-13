import type { UserItem } from "../../types";
import type { EditUserFormState, StateSetter, UserFormState } from "./types";

interface AdminUsersPanelProps {
  users: UserItem[];
  newUserForm: UserFormState;
  setNewUserForm: StateSetter<UserFormState>;
  editForm: EditUserFormState;
  setEditForm: StateSetter<EditUserFormState>;
  onCreateUser: () => void;
  onUpdateUser: () => void;
  onToggleStatus: (user: UserItem) => void;
}

export const AdminUsersPanel = ({
  users,
  newUserForm,
  setNewUserForm,
  editForm,
  setEditForm,
  onCreateUser,
  onUpdateUser,
  onToggleStatus
}: AdminUsersPanelProps) => {
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Gestao de usuarios</h3>
        <p className="text-sm text-textMuted">Cadastro, edicao e status de acesso</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
          <h4 className="font-display text-base text-textMain">Cadastrar usuario</h4>
          <input className="input" placeholder="Nome" value={newUserForm.name} onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="input" placeholder="Login" value={newUserForm.login} onChange={(event) => setNewUserForm((prev) => ({ ...prev, login: event.target.value }))} />
          <input className="input" type="password" placeholder="Senha" value={newUserForm.password} onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))} />
          <input className="input" placeholder="Setor" value={newUserForm.department} onChange={(event) => setNewUserForm((prev) => ({ ...prev, department: event.target.value }))} />
          <input className="input" placeholder="Funcao" value={newUserForm.job_title} onChange={(event) => setNewUserForm((prev) => ({ ...prev, job_title: event.target.value }))} />
          <select className="input" value={newUserForm.role} onChange={(event) => setNewUserForm((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))}>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary w-full" onClick={onCreateUser}>Cadastrar</button>
        </article>

        <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
          <h4 className="font-display text-base text-textMain">Editar usuario</h4>
          <select
            className="input"
            value={editForm.id || ""}
            onChange={(event) => {
              const selected = users.find((item) => item.id === Number(event.target.value));
              if (!selected) {
                return;
              }

              setEditForm({
                id: selected.id,
                name: selected.name,
                login: selected.login,
                department: selected.department,
                job_title: selected.jobTitle,
                role: selected.role,
                password: ""
              });
            }}
          >
            <option value="">Selecione</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.login})
              </option>
            ))}
          </select>
          <input className="input" placeholder="Nome" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="input" placeholder="Login" value={editForm.login} onChange={(event) => setEditForm((prev) => ({ ...prev, login: event.target.value }))} />
          <input className="input" placeholder="Setor" value={editForm.department} onChange={(event) => setEditForm((prev) => ({ ...prev, department: event.target.value }))} />
          <input className="input" placeholder="Funcao" value={editForm.job_title} onChange={(event) => setEditForm((prev) => ({ ...prev, job_title: event.target.value }))} />
          <select className="input" value={editForm.role} onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))}>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" type="password" placeholder="Nova senha (opcional)" value={editForm.password} onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))} />
          <button className="btn-primary w-full" onClick={onUpdateUser}>Salvar alteracoes</button>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h4 className="mb-3 font-display text-base text-textMain">Status dos usuarios</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {users.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <p className="text-sm font-semibold text-textMain">{item.name}</p>
              <p className="text-xs text-textMuted">{item.login}</p>
              <p className="mt-1 text-xs text-textMuted">
                {item.department} - {item.jobTitle}
              </p>
              <button
                className={`mt-2 rounded-md px-3 py-1 text-xs font-semibold ${item.isActive ? "bg-danger text-white" : "bg-success text-slate-900"}`}
                onClick={() => onToggleStatus(item)}
              >
                {item.isActive ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
};
