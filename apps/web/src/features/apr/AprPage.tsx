import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import type {
  AprAuditResponse,
  AprHistoryResponse,
  AprImportResult,
  AprManualPayload,
  AprMonthItem,
  AprMonthSummary,
  AprRow,
  AprSourceType
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

export const AprPage = ({ onError, onToast }: AprPageProps) => {
  const [months, setMonths] = useState<AprMonthItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthRef);
  const [historySource, setHistorySource] = useState<AprSourceType>("manual");
  const [summary, setSummary] = useState<AprMonthSummary | null>(null);
  const [manualRows, setManualRows] = useState<AprRow[]>([]);
  const [audit, setAudit] = useState<AprAuditResponse>(DEFAULT_AUDIT);
  const [history, setHistory] = useState<AprHistoryResponse>(DEFAULT_HISTORY);
  const [manualForm, setManualForm] = useState<AprManualFormState>(EMPTY_MANUAL_FORM);
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
      const [summaryResponse, rowsResponse, auditResponse, historyResponse] = await Promise.all([
        aprApi.getMonthSummary(selectedMonth, historySource),
        aprApi.getRows(selectedMonth, "manual"),
        aprApi.getAudit(selectedMonth, "all"),
        aprApi.getHistory(selectedMonth, historySource)
      ]);

      setSummary(summaryResponse);
      setManualRows(rowsResponse.rows);
      setAudit(auditResponse);
      setHistory(historyResponse);
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

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent">APR</p>
            <h2 className="font-display text-2xl text-textMain">Auditoria de producao rural</h2>
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
                  <strong>{importResult.monthRef}</strong>.
                </p>
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
                    {manualRows.length === 0 ? (
                      <tr>
                        <td className="py-4 text-textMuted" colSpan={5}>
                          Nenhum lancamento manual para este mes.
                        </td>
                      </tr>
                    ) : (
                      manualRows.map((row) => (
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
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    External ID
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    value={manualForm.external_id}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, external_id: event.target.value }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Data de abertura
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    type="date"
                    value={manualForm.opened_on}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, opened_on: event.target.value }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Assunto
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    value={manualForm.subject}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, subject: event.target.value }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
                    Colaborador
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
                    value={manualForm.collaborator}
                    onChange={(event) =>
                      setManualForm((current) => ({ ...current, collaborator: event.target.value }))
                    }
                  />
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
                    {audit.summary.divergentes} divergencias entre sistema e manual.
                  </p>
                </div>
                <span className="rounded-full bg-panelAlt px-3 py-1 text-xs text-textMuted">
                  {audit.summary.statusGeral}
                </span>
              </div>

              <div className="space-y-3">
                {audit.details.length === 0 ? (
                  <p className="text-sm text-textMuted">Nenhuma linha auditavel neste mes.</p>
                ) : (
                  audit.details.slice(0, 8).map((item) => (
                    <div
                      key={item.externalId}
                      className="rounded-xl border border-slate-700 bg-panelAlt p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-textMain">{item.externalId}</strong>
                        <span className="text-xs text-textMuted">{item.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-textMuted">
                        Sistema: {item.system?.subject ?? "ausente"} | Manual:{" "}
                        {item.manual?.subject ?? "ausente"}
                      </p>
                      {item.changed.length > 0 && (
                        <p className="mt-2 text-xs text-amber-100">
                          Campos alterados: {item.changed.join(", ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
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
                {history.details.length === 0 ? (
                  <p className="text-sm text-textMuted">Sem historico para a origem selecionada.</p>
                ) : (
                  history.details.slice(0, 8).map((item) => (
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
