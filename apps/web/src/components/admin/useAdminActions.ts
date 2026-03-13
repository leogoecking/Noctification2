import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { UserItem } from "../../types";
import type {
  AdminMenu,
  EditUserFormState,
  NotificationFormState,
  UserFormState
} from "./types";

interface UseAdminActionsOptions {
  onError: (message: string) => void;
  onToast: (message: string) => void;
  setMenu: (menu: AdminMenu) => void;
  reloadUsers: () => Promise<void>;
  reloadUnreadDashboard: () => Promise<void>;
  reloadNotificationHistory: () => Promise<void>;
}

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

export const useAdminActions = ({
  onError,
  onToast,
  setMenu,
  reloadUsers,
  reloadUnreadDashboard,
  reloadNotificationHistory
}: UseAdminActionsOptions) => {
  const [notificationForm, setNotificationForm] = useState<NotificationFormState>({
    title: "",
    message: "",
    priority: "normal",
    recipient_mode: "all",
    recipient_ids: []
  });
  const [newUserForm, setNewUserForm] = useState<UserFormState>({
    name: "",
    login: "",
    password: "",
    department: "",
    job_title: "",
    role: "user"
  });
  const [editForm, setEditForm] = useState<EditUserFormState>({
    id: 0,
    name: "",
    login: "",
    department: "",
    job_title: "",
    role: "user",
    password: ""
  });

  const sendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      onError("Titulo e mensagem sao obrigatorios");
      return;
    }

    if (notificationForm.recipient_mode === "users" && notificationForm.recipient_ids.length === 0) {
      onError("Selecione ao menos um destinatario");
      return;
    }

    try {
      await api.sendNotification(notificationForm);
      setNotificationForm({
        title: "",
        message: "",
        priority: "normal",
        recipient_mode: "all",
        recipient_ids: []
      });
      onToast("Notificacao enviada");
      await reloadUnreadDashboard();
      await reloadNotificationHistory();
      setMenu("dashboard");
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao enviar notificacao"));
    }
  };

  const createUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.login.trim() || !newUserForm.password.trim()) {
      onError("Nome, login e senha sao obrigatorios");
      return;
    }

    try {
      await api.createUser(newUserForm);
      onToast("Usuario criado com sucesso");
      setNewUserForm({
        name: "",
        login: "",
        password: "",
        department: "",
        job_title: "",
        role: "user"
      });
      await reloadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao criar usuario"));
    }
  };

  const updateUser = async () => {
    if (!editForm.id) {
      onError("Selecione um usuario para editar");
      return;
    }

    try {
      await api.updateUser(editForm.id, {
        name: editForm.name,
        login: editForm.login,
        department: editForm.department,
        job_title: editForm.job_title,
        role: editForm.role,
        password: editForm.password || undefined
      });

      onToast("Usuario atualizado");
      setEditForm((prev) => ({ ...prev, password: "" }));
      await reloadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao atualizar usuario"));
    }
  };

  const toggleStatus = async (user: UserItem) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      onToast(`Usuario ${user.isActive ? "desativado" : "ativado"}`);
      await reloadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao alterar status"));
    }
  };

  return {
    notificationForm,
    setNotificationForm,
    newUserForm,
    setNewUserForm,
    editForm,
    setEditForm,
    sendNotification,
    createUser,
    updateUser,
    toggleStatus
  };
};
