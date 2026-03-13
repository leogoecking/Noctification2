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
  insertCreatedNotification: (item: UserNotificationResponseItem) => void;
  upsertUser: (user: UserItem) => void;
  updateUserActiveState: (userId: number, isActive: boolean) => void;
}

type UserNotificationResponseItem = {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  recipient_mode: "all" | "users";
  created_at: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
  recipients: Array<{
    userId: number;
    name: string;
    login: string;
    visualizedAt: string | null;
    deliveredAt: string;
    operationalStatus: "recebida" | "visualizada" | "em_andamento" | "assumida" | "resolvida";
    responseAt: string | null;
    responseMessage: string | null;
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
    responded: number;
    received: number;
    visualized: number;
    inProgress: number;
    assumed: number;
    resolved: number;
    operationalPending: number;
    operationalCompleted: number;
  };
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

export const useAdminActions = ({
  onError,
  onToast,
  setMenu,
  insertCreatedNotification,
  upsertUser,
  updateUserActiveState
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
      const response = (await api.sendNotification(notificationForm)) as
        | {
            notification?: UserNotificationResponseItem;
          }
        | undefined;
      setNotificationForm({
        title: "",
        message: "",
        priority: "normal",
        recipient_mode: "all",
        recipient_ids: []
      });
      if (response?.notification) {
        insertCreatedNotification(response.notification);
      }
      onToast("Notificacao enviada");
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
      const response = (await api.createUser(newUserForm)) as { user?: UserItem } | undefined;
      onToast("Usuario criado com sucesso");
      if (response?.user) {
        upsertUser(response.user);
      }
      setNewUserForm({
        name: "",
        login: "",
        password: "",
        department: "",
        job_title: "",
        role: "user"
      });
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
      const response = (await api.updateUser(editForm.id, {
        name: editForm.name,
        login: editForm.login,
        department: editForm.department,
        job_title: editForm.job_title,
        role: editForm.role,
        password: editForm.password || undefined
      })) as { user?: UserItem } | undefined;

      onToast("Usuario atualizado");
      if (response?.user) {
        upsertUser(response.user);
      }
      setEditForm((prev) => ({ ...prev, password: "" }));
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao atualizar usuario"));
    }
  };

  const toggleStatus = async (user: UserItem) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      onToast(`Usuario ${user.isActive ? "desativado" : "ativado"}`);
      updateUserActiveState(user.id, !user.isActive);
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
