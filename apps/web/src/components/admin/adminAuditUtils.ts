export const AUDIT_LIMIT_OPTIONS = [10, 20, 50, 100];

export const AUDIT_LABELS = {
  actor: "Responsavel",
  target: "Alvo",
  category: "Categoria",
  details: "Detalhes",
  systemActor: "Sistema",
  noMetadata: "Sem detalhes adicionais"
} as const;

const AUDIT_METADATA_LABELS: Record<string, string> = {
  recipientCount: "Destinatarios",
  recipientIds: "IDs dos destinatarios",
  recipientUserIds: "IDs dos destinatarios",
  retryCount: "Tentativas",
  priority: "Prioridade",
  source: "Origem",
  responseStatus: "Status de resposta",
  operationalStatus: "Status operacional",
  previousStatus: "Status anterior",
  nextStatus: "Novo status",
  responseMessage: "Mensagem de resposta",
  message: "Mensagem",
  login: "Login",
  scheduledFor: "Agendado para",
  occurrenceId: "Ocorrencia",
  reminderId: "Lembrete",
  userId: "Usuario",
  notificationId: "Notificacao"
};

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    return value
      .map((item) => {
        if (typeof item === "number" && Number.isInteger(item)) {
          return `#${item}`;
        }

        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return String(item);
        }

        try {
          return JSON.stringify(item);
        } catch {
          return "[valor nao serializavel]";
        }
      })
      .join(", ");
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[valor nao serializavel]";
  }
};

export const summarizeAuditMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) {
    return AUDIT_LABELS.noMetadata;
  }

  const entries = Object.entries(metadata).slice(0, 3);
  if (entries.length === 0) {
    return AUDIT_LABELS.noMetadata;
  }

  return entries
    .map(([key, value]) => `${AUDIT_METADATA_LABELS[key] ?? key}: ${formatAuditValue(value)}`)
    .join(" | ");
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  "auth.login": "Login realizado",
  "auth.logout": "Logout realizado",
  "auth.register": "Conta criada",
  "admin.user.create": "Usuario criado",
  "admin.user.update": "Usuario atualizado",
  "admin.user.status": "Status de usuario alterado",
  "admin.notification.send": "Notificacao enviada",
  "notification.respond": "Notificacao respondida",
  "reminder.created": "Lembrete criado",
  "reminder.updated": "Lembrete atualizado",
  "reminder.deleted": "Lembrete arquivado",
  "reminder.occurrence.created": "Ocorrencia de lembrete criada",
  "reminder.occurrence.delivered": "Lembrete disparado",
  "reminder.occurrence.retried": "Lembrete reenviado",
  "reminder.occurrence.completed": "Lembrete concluido",
  "reminder.occurrence.expired": "Lembrete expirado",
  "reminder.occurrence.cancelled": "Ocorrencia cancelada"
};

export const formatAuditEventType = (eventType: string): string => {
  const mapped = AUDIT_EVENT_LABELS[eventType];
  if (mapped) {
    return mapped;
  }

  const normalized = eventType
    .replace(/[._]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

  return normalized || eventType;
};

export const formatAuditTargetType = (targetType: string): string => {
  switch (targetType) {
    case "user":
      return "Usuario";
    case "notification":
      return "Notificacao";
    case "reminder":
      return "Lembrete";
    case "occurrence":
      return "Ocorrencia";
    case "session":
      return "Sessao";
    default:
      return targetType
        .replace(/[._]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(" ");
  }
};

export const formatAuditActor = (
  actor: { name: string; login: string } | null
): string => {
  return actor ? `${actor.name} (${actor.login})` : AUDIT_LABELS.systemActor;
};

export const getAuditCategory = (
  eventType: string
): { label: string; className: string } => {
  if (eventType.startsWith("auth.")) {
    return {
      label: "Autenticacao",
      className: "bg-sky-500/15 text-sky-200 border border-sky-500/30"
    };
  }

  if (eventType.startsWith("admin.user.")) {
    return {
      label: "Usuarios",
      className: "bg-amber-500/15 text-amber-200 border border-amber-500/30"
    };
  }

  if (eventType.startsWith("admin.notification.")) {
    return {
      label: "Notificacoes",
      className: "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30"
    };
  }

  if (eventType.startsWith("reminder.")) {
    return {
      label: "Lembretes",
      className: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
    };
  }

  return {
    label: "Sistema",
    className: "border border-outlineSoft/70 bg-panel text-textMain"
  };
};
