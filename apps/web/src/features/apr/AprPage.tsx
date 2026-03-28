import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import type {
  AprAuditResponse,
  AprCollaboratorSuggestion,
  AprHistoryResponse,
  AprImportResult,
  AprManualPayload,
  AprMonthItem,
  AprMonthSummary,
  AprRow,
  AprSourceType,
  AprSubjectSuggestion
} from "./types";

interface AprPageProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type AprManualFormState = AprManualPayload & {
  id: number | null;
};

const EMPTY_MANUAL_FORM: AprManualFormState = {
  id: null,
  external_id: "",
  opened_on: "",
  subject: "",
  collaborator: ""
};

const MANUAL_ROWS_PER_PAGE = 5;
const AUDIT_ROWS_PER_PAGE = 5;

const DEFAULT_AUDIT: AprAuditResponse = {
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

const DEFAULT_HISTORY: AprHistoryResponse = {
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

const formatMonthLabel = (monthRef: string): string => {
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

const formatDate = (value: string | null | undefined): string => {
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

const currentMonthRef = (): string => new Date().toISOString().slice(0, 7);

const sortMonthsDesc = (months: AprMonthItem[]): AprMonthItem[] =>
  [...months].sort((left, right) => right.monthRef.localeCompare(left.monthRef));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeSearchValue = (value: string): string => value.trim().toLowerCase();

export const AprPage = ({ onError, onToast }: AprPageProps) => {
  const [months, setMonths] = useState<AprMonthItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthRef);
  const [historySource, setHistorySource] = useState<AprSourceType>("manual");
  const [summary, setSummary] = useState<AprMonthSummary | null>(null);
  const [manualRows, setManualRows] = useState<AprRow[]>([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState<AprSubjectSuggestion[]>([]);
  const [collaboratorSuggestions, setCollaboratorSuggestions] = useState<AprCollaboratorSuggestion[]>([]);
  const [audit, setAudit] = useState<AprAuditResponse>(DEFAULT_AUDIT);
  const [history, setHistory] = useState<AprHistoryResponse>(DEFAULT_HISTORY);
  const [manualForm, setManualForm] = useState<AprManualFormState>(EMPTY_MANUAL_FORM);
  const [manualPage, setManualPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [manualSearch, setManualSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [importSource, setImportSource] = useState<AprSourceType>("manual");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<AprImportResult | null>(null);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingMonthData, setLoadingMonthData] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const orderedMonths = useMemo(() => sortMonthsDesc(months), [months]);

  const loadMonths = useCallback(async () => {
    setLoadingMonths(true);

    try {
      const response = await aprApi.listMonths();
      setMonths(response.months);

      if (response.months.length > 0) {
        const monthExists = response.months.some((item) => item.monthRef === selectedMonth);
        if (!monthExists) {
          setSelectedMonth(sortMonthsDesc(response.months)[0].monthRef);
        }
      }
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar meses APR");
    } finally {
      setLoadingMonths(false);
    }
  }, [onError, selectedMonth]);

  const loadSelectedMonth = useCallback(async () => {
    if (!selectedMonth) {
      return;
    }

    setLoadingMonthData(true);

    try {
      const [
        summaryResponse,
        rowsResponse,
        auditResponse,
        historyResponse,
        subjectsResponse,
        collaboratorsResponse
      ] = await Promise.all([
        aprApi.getMonthSummary(selectedMonth, historySource),
        aprApi.getRows(selectedMonth, "manual"),
        aprApi.getAudit(selectedMonth, "all"),
        aprApi.getHistory(selectedMonth, historySource),
        aprApi.listSubjects(),
        aprApi.listCollaborators()
      ]);

      setSummary(summaryResponse);
      setManualRows(rowsResponse.rows);
      setAudit(auditResponse);
      setHistory(historyResponse);
      setSubjectSuggestions(subjectsResponse.subjects);
      setCollaboratorSuggestions(collaboratorsResponse.collaborators);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar dados APR");
    } finally {
      setLoadingMonthData(false);
    }
  }, [historySource, onError, selectedMonth]);

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    void loadSelectedMonth();
  }, [loadSelectedMonth]);

  const resetManualForm = useCallback(() => {
    setManualForm(EMPTY_MANUAL_FORM);
  }, []);

  const startEditManual = useCallback((row: AprRow) => {
    setManualForm({
      id: row.id,
      external_id: row.externalId,
      opened_on: row.openedOn,
      subject: row.subject,
      collaborator: row.collaborator
    });
  }, []);

  const refreshAfterMutation = useCallback(
    async (monthRef?: string) => {
      await loadMonths();
      if (monthRef && monthRef !== selectedMonth) {
        setSelectedMonth(monthRef);
        return;
      }

      await loadSelectedMonth();
    },
    [loadMonths, loadSelectedMonth, selectedMonth]
  );

  const saveManual = useCallback(async () => {
    setSavingManual(true);

    try {
      if (manualForm.id) {
        const response = await aprApi.updateManual(selectedMonth, manualForm.id, manualForm);
        resetManualForm();
        await refreshAfterMutation(response.savedMonthRef);
        onToast(response.moved ? "Lancamento movido e atualizado" : "Lancamento atualizado");
        return;
      }

      const response = await aprApi.createManual(selectedMonth, manualForm);
      resetManualForm();
      await refreshAfterMutation(response.savedMonthRef);
      onToast(response.moved ? "Lancamento criado em outro mes de referencia" : "Lancamento criado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar lancamento manual");
    } finally {
      setSavingManual(false);
    }
  }, [manualForm, onError, onToast, refreshAfterMutation, resetManualForm, selectedMonth]);

  const removeManual = useCallback(
    async (row: AprRow) => {
      try {
        await aprApi.deleteManual(selectedMonth, row.id);
        if (manualForm.id === row.id) {
          resetManualForm();
        }
        await refreshAfterMutation();
        onToast("Lancamento removido");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao remover lancamento");
      }
    },
    [manualForm.id, onError, onToast, refreshAfterMutation, resetManualForm, selectedMonth]
  );

  const submitImport = useCallback(async () => {
    if (!importFile) {
      onError("Selecione um arquivo para importar");
      return;
    }

    setUploading(true);

    try {
      const response = await aprApi.importRows(importSource, importFile, selectedMonth);
      setImportResult(response);
      setImportFile(null);
      await refreshAfterMutation(response.monthRef);
      onToast("Importacao APR concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao importar arquivo APR");
    } finally {
      setUploading(false);
    }
  }, [importFile, importSource, onError, onToast, refreshAfterMutation, selectedMonth]);

  const monthStats = useMemo(
    () => [
      { label: "Manual", value: String(summary?.manualCount ?? 0) },
      { label: "Sistema", value: String(summary?.systemCount ?? 0) },
      { label: "Divergencias", value: String(summary?.audit.divergentes ?? 0) },
      { label: "Colaboradores", value: String(summary?.uniqueCollaborators ?? 0) }
    ],
    [summary]
  );

  const filteredManualRows = useMemo(() => {
    const searchTerm = normalizeSearchValue(manualSearch);
    if (!searchTerm) {
      return manualRows;
    }

    return manualRows.filter((row) =>
      [row.externalId, row.openedOn, row.subject, row.collaborator].some((value) =>
        value.toLowerCase().includes(searchTerm)
      )
    );
  }, [manualRows, manualSearch]);

  const manualTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredManualRows.length / MANUAL_ROWS_PER_PAGE)),
    [filteredManualRows.length]
  );

  const paginatedManualRows = useMemo(() => {
    const startIndex = (manualPage - 1) * MANUAL_ROWS_PER_PAGE;
    return filteredManualRows.slice(startIndex, startIndex + MANUAL_ROWS_PER_PAGE);
  }, [filteredManualRows, manualPage]);

  const divergentAuditRows = useMemo(
    () =>
      audit.details
        .filter((item) => item.status !== "Conferido")
        .map((item) => ({
          externalId: item.externalId,
          status: item.status,
          subject: item.manual?.subject ?? item.system?.subject ?? "ausente",
          collaborator: item.manual?.collaborator ?? item.system?.collaborator ?? "ausente"
        })),
    [audit.details]
  );

  const filteredAuditRows = useMemo(() => {
    const searchTerm = normalizeSearchValue(auditSearch);
    if (!searchTerm) {
      return divergentAuditRows;
    }

    return divergentAuditRows.filter((item) =>
      [item.externalId, item.status, item.subject, item.collaborator].some((value) =>
        value.toLowerCase().includes(searchTerm)
      )
    );
  }, [auditSearch, divergentAuditRows]);

  const auditTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAuditRows.length / AUDIT_ROWS_PER_PAGE)),
    [filteredAuditRows.length]
  );

  const paginatedAuditRows = useMemo(() => {
    const startIndex = (auditPage - 1) * AUDIT_ROWS_PER_PAGE;
    return filteredAuditRows.slice(startIndex, startIndex + AUDIT_ROWS_PER_PAGE);
  }, [auditPage, filteredAuditRows]);

  const filteredHistoryRows = useMemo(() => {
    const searchTerm = normalizeSearchValue(historySearch);
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
  }, [history.details, historySearch]);

  useEffect(() => {
    setManualPage(1);
    setAuditPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    setManualPage((current) => Math.min(current, manualTotalPages));
  }, [manualTotalPages]);

  useEffect(() => {
    setAuditPage((current) => Math.min(current, auditTotalPages));
  }, [auditTotalPages]);

  const exportAuditPdf = useCallback(() => {
    const divergentDetails = audit.details.filter((item) => item.status !== "Conferido");
    if (!divergentDetails.length) {
      onError("Nao ha divergencias para exportar");
      return;
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

    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("title", "apr-audit-pdf-export");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";

    const cleanup = () => {
      window.setTimeout(() => {
        printFrame.remove();
      }, 1000);
    };

    printFrame.onload = () => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        cleanup();
        onError("Nao foi possivel preparar a exportacao em PDF");
        return;
      }

      frameWindow.focus();
      frameWindow.print();
      cleanup();
    };

    document.body.appendChild(printFrame);
    const frameDocument = printFrame.contentDocument;
    if (!frameDocument) {
      cleanup();
      onError("Nao foi possivel preparar a exportacao em PDF");
      return;
    }

    frameDocument.open();
    frameDocument.write(reportHtml);
    frameDocument.close();
  }, [audit.details, audit.summary.divergentes, onError, selectedMonth]);

  const visibleSubjectSuggestions = useMemo(() => {
    const currentValue = manualForm.subject.trim().toUpperCase();
    return subjectSuggestions
      .filter((item) => !currentValue || item.subject.includes(currentValue))
      .slice(0, 12);
  }, [manualForm.subject, subjectSuggestions]);

  const visibleCollaboratorSuggestions = useMemo(() => {
    const currentValue = manualForm.collaborator.trim().toLowerCase();
    return collaboratorSuggestions
      .filter((item) => !currentValue || item.displayName.toLowerCase().includes(currentValue))
      .slice(0, 12);
  }, [collaboratorSuggestions, manualForm.collaborator]);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent">APR</p>
            <h2 className="font-display text-2xl text-textMain">Controle de APR</h2>
            <p className="mt-1 text-sm text-textMuted">
              Modulo isolado para referencia mensal, conferencia manual e historico.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              (summary?.statusGeral ?? "Conferido") === "Conferido"
                ? "bg-success/20 text-green-100"
                : "bg-amber-500/15 text-amber-100"
            }`}
          >
            {(summary?.statusGeral ?? "Conferido") === "Conferido" ? "Base conferida" : "Com divergencias"}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[18rem,1fr]">
        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-700 bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base text-textMain">Meses</h3>
              {loadingMonths && <span className="text-xs text-textMuted">Atualizando...</span>}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted" htmlFor="apr-month-input">
                Referencia manual
              </label>
              <input
                id="apr-month-input"
                className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              {orderedMonths.length === 0 && !loadingMonths ? (
                <p className="rounded-xl border border-dashed border-slate-600 px-3 py-4 text-sm text-textMuted">
                  Nenhum mes APR persistido ainda. Voce pode comecar pelo mes atual.
                </p>
              ) : (
                orderedMonths.map((month) => (
                  <button
                    key={month.monthRef}
                    type="button"
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      month.monthRef === selectedMonth
                        ? "border-accent bg-accent/10 text-textMain"
                        : "border-slate-700 bg-panelAlt text-textMuted hover:text-textMain"
                    }`}
                    onClick={() => setSelectedMonth(month.monthRef)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{formatMonthLabel(month.monthRef)}</span>
                      <span className="text-xs">{month.monthRef}</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="rounded-full bg-slate-900/50 px-2 py-1">
                        Manual {month.manualCount}
                      </span>
                      <span className="rounded-full bg-slate-900/50 px-2 py-1">
                        Sistema {month.systemCount}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-panel p-4">
            <h3 className="font-display text-base text-textMain">Importacao</h3>
            <p className="mt-1 text-sm text-textMuted">
              Envia CSV, XLSX ou XLS para a base APR deste modulo.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                  Origem
                </span>
                <select
                  className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                  value={importSource}
                  onChange={(event) => setImportSource(event.target.value as AprSourceType)}
                >
                  <option value="manual">manual</option>
                  <option value="system">system</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                  Arquivo
                </span>
                <input
                  className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-slate-900"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <button
                className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={uploading}
                onClick={() => void submitImport()}
              >
                {uploading ? "Importando..." : "Importar arquivo"}
              </button>
            </div>

            {importResult && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-panelAlt p-3 text-sm text-textMain">
                <p>
                  <strong>{importResult.totalValid}</strong> validos e{" "}
                  <strong>{importResult.totalInvalid}</strong> invalidos em{" "}
                  <strong>{importResult.importedMonths.join(", ")}</strong>.
                </p>
                {importResult.monthDetectedByDate && (
                  <p className="mt-2 text-amber-100">
                    Mes solicitado: {importResult.requestedMonthRef}. Meses reconhecidos:{" "}
                    {importResult.importedMonths.join(", ")}.
                  </p>
                )}
                {importResult.duplicates.length > 0 && (
                  <p className="mt-2 text-textMuted">
                    Duplicados ignorados: {importResult.duplicates.join(", ")}
                  </p>
                )}
              </div>
            )}
          </article>
        </aside>

        <div className="space-y-4">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {monthStats.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-700 bg-panel p-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{item.label}</p>
                <p className="mt-2 font-display text-2xl text-textMain">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
            <article className="rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-textMain">Tabela manual</h3>
                  <p className="text-sm text-textMuted">
                    Edicao isolada da base manual do mes {selectedMonth}.
                  </p>
                </div>
                {loadingMonthData && <span className="text-xs text-textMuted">Carregando...</span>}
              </div>

              <div className="overflow-x-auto">
                <div className="mb-3">
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    type="search"
                    placeholder="Busca rapida na tabela manual"
                    value={manualSearch}
                    onChange={(event) => setManualSearch(event.target.value)}
                  />
                </div>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-textMuted">
                    <tr>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">Abertura</th>
                      <th className="pb-2 pr-4">Assunto</th>
                      <th className="pb-2 pr-4">Colaborador</th>
                      <th className="pb-2 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManualRows.length === 0 ? (
                      <tr>
                        <td className="py-4 text-textMuted" colSpan={5}>
                          Nenhum lancamento manual encontrado para este filtro.
                        </td>
                      </tr>
                    ) : (
                      paginatedManualRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-800">
                          <td className="py-3 pr-4 font-medium text-textMain">{row.externalId}</td>
                          <td className="py-3 pr-4 text-textMuted">{row.openedOn}</td>
                          <td className="py-3 pr-4 text-textMain">{row.subject}</td>
                          <td className="py-3 pr-4 text-textMuted">{row.collaborator}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMain"
                                type="button"
                                onClick={() => startEditManual(row)}
                              >
                                Editar
                              </button>
                              <button
                                className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-red-200"
                                type="button"
                                onClick={() => void removeManual(row)}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredManualRows.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-textMuted">
                  <p>
                    Pagina {manualPage} de {manualTotalPages} | Total {filteredManualRows.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={manualPage <= 1}
                      onClick={() => setManualPage((current) => Math.max(1, current - 1))}
                    >
                      Pagina anterior
                    </button>
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={manualPage >= manualTotalPages}
                      onClick={() => setManualPage((current) => Math.min(manualTotalPages, current + 1))}
                    >
                      Proxima pagina
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-textMain">
                    {manualForm.id ? "Editar lancamento" : "Novo lancamento"}
                  </h3>
                  <p className="text-sm text-textMuted">
                    CRUD manual sem tocar em outros fluxos do sistema.
                  </p>
                </div>
                {manualForm.id && (
                  <button
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMuted"
                    type="button"
                    onClick={resetManualForm}
                  >
                    Cancelar edicao
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <label className="block" htmlFor="apr-manual-external-id">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    External ID
                  </span>
                  <input
                    id="apr-manual-external-id"
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    value={manualForm.external_id}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, external_id: event.target.value }))
                    }
                  />
                </label>

                <label className="block" htmlFor="apr-manual-opened-on">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Data de abertura
                  </span>
                  <input
                    id="apr-manual-opened-on"
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    type="date"
                    value={manualForm.opened_on}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, opened_on: event.target.value }))
                    }
                  />
                </label>

                <label className="block" htmlFor="apr-manual-subject">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Assunto
                  </span>
                  <input
                    id="apr-manual-subject"
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    list="apr-subject-suggestions"
                    value={manualForm.subject}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, subject: event.target.value }))
                    }
                  />
                  <datalist id="apr-subject-suggestions">
                    {visibleSubjectSuggestions.map((item) => (
                      <option key={item.subject} value={item.subject}>
                        {item.subject}
                      </option>
                    ))}
                  </datalist>
                </label>

                <label className="block" htmlFor="apr-manual-collaborator">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Colaborador
                  </span>
                  <input
                    id="apr-manual-collaborator"
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    list="apr-collaborator-suggestions"
                    value={manualForm.collaborator}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, collaborator: event.target.value }))
                    }
                  />
                  <datalist id="apr-collaborator-suggestions">
                    {visibleCollaboratorSuggestions.map((item) => (
                      <option key={item.displayName} value={item.displayName}>
                        {item.displayName}
                      </option>
                    ))}
                  </datalist>
                </label>

                <button
                  className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={savingManual}
                  onClick={() => void saveManual()}
                >
                  {savingManual
                    ? "Salvando..."
                    : manualForm.id
                      ? "Atualizar lancamento"
                      : "Criar lancamento"}
                </button>
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-textMain">Audit / divergencias</h3>
                  <p className="text-sm text-textMuted">
                    {filteredAuditRows.length} divergencias entre sistema e manual.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={divergentAuditRows.length === 0}
                    onClick={exportAuditPdf}
                  >
                    Exportar PDF
                  </button>
                  <span className="rounded-full bg-panelAlt px-3 py-1 text-xs text-textMuted">
                    {audit.summary.statusGeral}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    type="search"
                    placeholder="Busca rapida nas divergencias"
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.target.value)}
                  />
                </div>
                {filteredAuditRows.length === 0 ? (
                  <p className="text-sm text-textMuted">Nenhuma divergencia encontrada para este filtro.</p>
                ) : (
                  paginatedAuditRows.map((item) => (
                    <div
                      key={item.externalId}
                      className="rounded-xl border border-slate-700 bg-panelAlt p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-textMain">{item.externalId}</strong>
                        <span className="text-xs text-textMuted">{item.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-textMuted">
                        Assunto: {item.subject}
                      </p>
                      <p className="mt-2 text-xs text-textMuted">
                        Nome do colaborador: {item.collaborator}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {filteredAuditRows.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-textMuted">
                  <p>
                    Pagina {auditPage} de {auditTotalPages} | Total {filteredAuditRows.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                    >
                      Pagina anterior divergencias
                    </button>
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage((current) => Math.min(auditTotalPages, current + 1))}
                    >
                      Proxima pagina divergencias
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-textMain">History</h3>
                  <p className="text-sm text-textMuted">
                    Comparacao com {history.previousMonthRef || "mes anterior"}.
                  </p>
                </div>
                <select
                  className="rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                  value={historySource}
                  onChange={(event) => setHistorySource(event.target.value as AprSourceType)}
                >
                  <option value="manual">manual</option>
                  <option value="system">system</option>
                </select>
              </div>

              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-panelAlt p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Novos</p>
                  <p className="mt-1 font-display text-xl text-textMain">{history.summary.novo}</p>
                </div>
                <div className="rounded-xl bg-panelAlt p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Alterados</p>
                  <p className="mt-1 font-display text-xl text-textMain">{history.summary.alterado}</p>
                </div>
                <div className="rounded-xl bg-panelAlt p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Sem alteracao</p>
                  <p className="mt-1 font-display text-xl text-textMain">
                    {history.summary.semAlteracao}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    type="search"
                    placeholder="Busca rapida no historico"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                  />
                </div>
                {filteredHistoryRows.length === 0 ? (
                  <p className="text-sm text-textMuted">Sem historico encontrado para este filtro.</p>
                ) : (
                  filteredHistoryRows.slice(0, 8).map((item) => (
                    <div
                      key={item.externalId}
                      className="rounded-xl border border-slate-700 bg-panelAlt p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-textMain">{item.externalId}</strong>
                        <span className="text-xs text-textMuted">{item.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-textMuted">
                        Atual: {item.current?.subject ?? "ausente"} | Anterior:{" "}
                        {item.previous?.subject ?? "ausente"}
                      </p>
                      {item.changed.length > 0 && (
                        <p className="mt-2 text-xs text-amber-100">
                          Mudancas: {item.changed.join(", ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-textMain">Resumo do mes</h3>
                <p className="text-sm text-textMuted">
                  Visao sintetica da referencia {formatMonthLabel(selectedMonth)}.
                </p>
              </div>
              <div className="text-right text-sm text-textMuted">
                <p>Ultimo mes comparado: {summary?.previousMonthRef ?? "Sem historico"}</p>
                <p>Historico: {summary?.history.sourceType ?? historySource}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Conferidos</p>
                <p className="mt-1 font-display text-xl text-textMain">{summary?.audit.conferido ?? 0}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">So no sistema</p>
                <p className="mt-1 font-display text-xl text-textMain">{summary?.audit.soSistema ?? 0}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">So no manual</p>
                <p className="mt-1 font-display text-xl text-textMain">{summary?.audit.soManual ?? 0}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Ultima importacao</p>
                <p className="mt-1 text-sm text-textMain">
                  {formatDate(
                    orderedMonths.find((item) => item.monthRef === selectedMonth)?.lastManualImportAt ??
                      orderedMonths.find((item) => item.monthRef === selectedMonth)?.lastSystemImportAt
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};
