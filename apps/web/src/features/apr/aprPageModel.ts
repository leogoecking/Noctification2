import type {
  AprAuditResponse,
  AprCollaboratorSuggestion,
  AprHistoryResponse,
  AprManualPayload,
  AprMonthItem,
  AprRow,
  AprSubjectSuggestion
} from "./types";

export type AprManualFormState = AprManualPayload & {
  id: number | null;
};

export interface AprDivergentAuditRow {
  externalId: string;
  status: "Só no sistema" | "Só no manual";
  subject: string;
  collaborator: string;
}

export interface AprCollaboratorRiskBar {
  collaborator: string;
  systemCount: number;
  manualCount: number;
  uniqueIds: number;
  divergentIds: number;
  statusLabel: "Consistente" | "Divergente";
  details: {
    externalId: string;
    subject: string;
    systemPresent: boolean;
    manualPresent: boolean;
    statusLabel: "Consistente" | "Divergente";
  }[];
}

export const EMPTY_MANUAL_FORM: AprManualFormState = {
  id: null,
  external_id: "",
  opened_on: "",
  subject: "",
  collaborator: ""
};

export const MANUAL_ROWS_PER_PAGE = 5;
export const AUDIT_ROWS_PER_PAGE = 5;

export const DEFAULT_AUDIT: AprAuditResponse = {
  monthRef: "",
  summary: {
    totalSistema: 0,
    totalManual: 0,
    conferido: 0,
    soSistema: 0,
    soManual: 0,
    totalIds: 0,
    statusGeral: "Conferido",
    divergentes: 0
  },
  details: []
};

export const DEFAULT_HISTORY: AprHistoryResponse = {
  monthRef: "",
  previousMonthRef: "",
  sourceType: "manual",
  summary: {
    totalAtual: 0,
    totalAnterior: 0,
    novo: 0,
    alterado: 0,
    semAlteracao: 0,
    totalIds: 0
  },
  details: []
};

export const formatMonthLabel = (monthRef: string): string => {
  if (!/^\d{4}-\d{2}$/.test(monthRef)) {
    return monthRef;
  }

  const [year, month] = monthRef.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: value.includes("T") ? "short" : undefined
  }).format(date);
};

export const currentMonthRef = (): string => new Date().toISOString().slice(0, 7);

export const sortMonthsDesc = (months: AprMonthItem[]): AprMonthItem[] =>
  [...months].sort((left, right) => right.monthRef.localeCompare(left.monthRef));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeSearchValue = (value: string): string => value.trim().toLowerCase();

export const clampPage = (page: number, totalPages: number): number =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1));

export const paginateRows = <T>(rows: T[], page: number, perPage: number): T[] => {
  const startIndex = (page - 1) * perPage;
  return rows.slice(startIndex, startIndex + perPage);
};

export const buildAprCollaboratorRiskBars = (
  manualRows: AprRow[],
  audit: AprAuditResponse,
  _history: AprHistoryResponse
): AprCollaboratorRiskBar[] => {
  const manualByExternalId = new Map(manualRows.map((row) => [row.externalId, row] as const));
  const collaboratorMap = new Map<
    string,
    {
      displayName: string;
      systemIds: Set<string>;
      manualIds: Set<string>;
      details: Map<
        string,
        {
          externalId: string;
          subject: string;
          systemPresent: boolean;
          manualPresent: boolean;
          statusLabel: "Consistente" | "Divergente";
        }
      >;
    }
  >();

  const normalizeCollaboratorKey = (collaborator: string) =>
    collaborator
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLocaleUpperCase("pt-BR");

  const ensureCollaborator = (collaborator: string | null | undefined) => {
    const trimmed = collaborator?.trim();
    if (!trimmed) return null;

    const normalized = normalizeCollaboratorKey(trimmed);

    const existing = collaboratorMap.get(normalized);
    if (existing) {
      return existing;
    }

    const created = {
      displayName: trimmed,
      systemIds: new Set<string>(),
      manualIds: new Set<string>(),
      details: new Map<
        string,
        {
          externalId: string;
          subject: string;
          systemPresent: boolean;
          manualPresent: boolean;
          statusLabel: "Consistente" | "Divergente";
        }
      >()
    };
    collaboratorMap.set(normalized, created);
    return created;
  };

  audit.details.forEach((item) => {
    const fallbackManual = manualByExternalId.get(item.externalId);
    const collaborator =
      item.manual?.collaborator ?? item.system?.collaborator ?? fallbackManual?.collaborator;
    const bucket = ensureCollaborator(collaborator);
    if (!bucket) {
      return;
    }

    const subject = item.manual?.subject ?? item.system?.subject ?? fallbackManual?.subject ?? "Sem assunto";
    const isConsistent = item.status === "Conferido";
    const systemPresent = isConsistent ? true : Boolean(item.system);
    const manualPresent = isConsistent ? true : Boolean(item.manual ?? fallbackManual);

    if (systemPresent) {
      bucket.systemIds.add(item.externalId);
    }
    if (manualPresent) {
      bucket.manualIds.add(item.externalId);
    }

    bucket.details.set(item.externalId, {
      externalId: item.externalId,
      subject,
      systemPresent,
      manualPresent,
      statusLabel: isConsistent ? "Consistente" : "Divergente"
    });
  });

  return [...collaboratorMap.entries()]
    .map(([, data]): AprCollaboratorRiskBar => {
      const details = [...data.details.values()].sort((left, right) =>
        left.externalId.localeCompare(right.externalId)
      );
      const divergentIds = details.filter((item) => item.statusLabel === "Divergente").length;
      const statusLabel: AprCollaboratorRiskBar["statusLabel"] =
        divergentIds > 0 ? "Divergente" : "Consistente";

      return {
        collaborator: data.displayName,
        systemCount: data.systemIds.size,
        manualCount: data.manualIds.size,
        uniqueIds: data.details.size,
        divergentIds,
        statusLabel,
        details
      };
    })
    .sort(
      (left, right) =>
        right.divergentIds - left.divergentIds ||
        right.uniqueIds - left.uniqueIds ||
        left.collaborator.localeCompare(right.collaborator)
    );
};

export const filterManualRows = (rows: AprRow[], search: string): AprRow[] => {
  const searchTerm = normalizeSearchValue(search);
  if (!searchTerm) {
    return rows;
  }

  return rows.filter((row) =>
    [row.externalId, row.openedOn, row.subject, row.collaborator].some((value) =>
      value.toLowerCase().includes(searchTerm)
    )
  );
};

export const buildDivergentAuditRows = (audit: AprAuditResponse): AprDivergentAuditRow[] =>
  audit.details
    .filter(
      (item): item is typeof item & { status: "Só no sistema" | "Só no manual" } =>
        item.status !== "Conferido"
    )
    .map((item) => ({
      externalId: item.externalId,
      status: item.status,
      subject: item.manual?.subject ?? item.system?.subject ?? "ausente",
      collaborator: item.manual?.collaborator ?? item.system?.collaborator ?? "ausente"
    }));

export const filterAuditRows = (
  rows: AprDivergentAuditRow[],
  search: string
): AprDivergentAuditRow[] => {
  const searchTerm = normalizeSearchValue(search);
  if (!searchTerm) {
    return rows;
  }

  return rows.filter((item) =>
    [item.externalId, item.status, item.subject, item.collaborator].some((value) =>
      value.toLowerCase().includes(searchTerm)
    )
  );
};

export const filterHistoryRows = (
  history: AprHistoryResponse,
  search: string
): AprHistoryResponse["details"] => {
  const searchTerm = normalizeSearchValue(search);
  if (!searchTerm) {
    return history.details;
  }

  return history.details.filter((item) =>
    [
      item.externalId,
      item.status,
      item.current?.subject ?? "",
      item.current?.collaborator ?? "",
      item.previous?.subject ?? "",
      item.previous?.collaborator ?? ""
    ].some((value) => value.toLowerCase().includes(searchTerm))
  );
};

export const getVisibleSubjectSuggestions = (
  suggestions: AprSubjectSuggestion[],
  subject: string
): AprSubjectSuggestion[] => {
  const currentValue = subject.trim().toUpperCase();
  return suggestions
    .filter((item) => !currentValue || item.subject.includes(currentValue))
    .slice(0, 12);
};

export const getVisibleCollaboratorSuggestions = (
  suggestions: AprCollaboratorSuggestion[],
  collaborator: string
): AprCollaboratorSuggestion[] => {
  const currentValue = collaborator.trim().toLowerCase();
  return suggestions
    .filter((item) => !currentValue || item.displayName.toLowerCase().includes(currentValue))
    .slice(0, 12);
};

export const openAuditReportPreview = (
  selectedMonth: string,
  audit: AprAuditResponse
): boolean => {
  const divergentDetails = audit.details.filter((item) => item.status !== "Conferido");
  if (!divergentDetails.length) {
    return false;
  }

  const reportRows = divergentDetails
    .map((item) => {
      const rowSource = item.manual ?? item.system;
      const subject = escapeHtml(rowSource?.subject ?? "ausente");
      const collaborator = escapeHtml(rowSource?.collaborator ?? "ausente");

      return `
          <tr>
            <td>${escapeHtml(item.externalId)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${subject}</td>
            <td>${collaborator}</td>
          </tr>
        `;
    })
    .join("");

  const reportHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Relatorio APR ${escapeHtml(selectedMonth)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; font-size: 12px; }
      th { background: #f3f4f6; }
      .meta { margin-top: 12px; color: #4b5563; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Relatorio de divergencias APR</h1>
    <p><strong>Referencia:</strong> ${escapeHtml(formatMonthLabel(selectedMonth))} (${escapeHtml(selectedMonth)})</p>
    <p><strong>Total de divergencias:</strong> ${String(audit.summary.divergentes)}</p>
    <p class="meta">Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Assunto</th>
          <th>Nome do colaborador</th>
        </tr>
      </thead>
      <tbody>${reportRows}</tbody>
    </table>
  </body>
</html>`;

  const reportBlob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
  const reportUrl = URL.createObjectURL(reportBlob);
  const previewLink = document.createElement("a");
  previewLink.href = reportUrl;
  previewLink.target = "_blank";
  previewLink.rel = "noopener noreferrer";
  previewLink.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(reportUrl);
  }, 60_000);

  return true;
};
