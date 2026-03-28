import type {
  AprAuditResponse,
  AprCollaboratorSuggestion,
  AprHistoryResponse,
  AprManualPayload,
  AprMonthItem,
  AprMonthSummary,
  AprRow,
  AprSubjectSuggestion
} from "./types";

export type AprManualFormState = AprManualPayload & {
  id: number | null;
};

export interface AprMonthStat {
  label: string;
  value: string;
}

export interface AprDivergentAuditRow {
  externalId: string;
  status: "Só no sistema" | "Só no manual";
  subject: string;
  collaborator: string;
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

export const normalizeSearchValue = (value: string): string => value.trim().toLowerCase();

export const clampPage = (page: number, totalPages: number): number =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1));

export const paginateRows = <T>(rows: T[], page: number, perPage: number): T[] => {
  const startIndex = (page - 1) * perPage;
  return rows.slice(startIndex, startIndex + perPage);
};

export const getMonthStats = (summary: AprMonthSummary | null): AprMonthStat[] => [
  { label: "Manual", value: String(summary?.manualCount ?? 0) },
  { label: "Sistema", value: String(summary?.systemCount ?? 0) },
  { label: "Divergencias", value: String(summary?.audit.divergentes ?? 0) },
  { label: "Colaboradores", value: String(summary?.uniqueCollaborators ?? 0) }
];

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
