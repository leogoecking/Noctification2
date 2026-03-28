import type { Dispatch, SetStateAction } from "react";
import { formatDate, formatMonthLabel, type AprManualFormState, type AprDivergentAuditRow } from "./aprPageModel";
import type { UseAprPageControllerResult } from "./useAprPageController";
import type {
  AprHistoryResponse,
  AprMonthItem,
  AprRow,
  AprSourceType
} from "./types";

type ManualFormSetter = Dispatch<SetStateAction<AprManualFormState>>;

interface SidebarProps {
  orderedMonths: AprMonthItem[];
  selectedMonth: string;
  setSelectedMonth: Dispatch<SetStateAction<string>>;
  loadingMonths: boolean;
  importSource: AprSourceType;
  setImportSource: Dispatch<SetStateAction<AprSourceType>>;
  setImportFile: Dispatch<SetStateAction<File | null>>;
  importResult: UseAprPageControllerResult["importResult"];
  uploading: boolean;
  submitImport: () => Promise<void>;
}

export const AprSidebar = ({
  orderedMonths,
  selectedMonth,
  setSelectedMonth,
  loadingMonths,
  importSource,
  setImportSource,
  setImportFile,
  importResult,
  uploading,
  submitImport
}: SidebarProps) => (
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
                <span className="rounded-full bg-slate-900/50 px-2 py-1">Manual {month.manualCount}</span>
                <span className="rounded-full bg-slate-900/50 px-2 py-1">Sistema {month.systemCount}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </article>

    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <h3 className="font-display text-base text-textMain">Importacao</h3>
      <p className="mt-1 text-sm text-textMuted">Envia CSV ou XLSX para a base APR deste modulo.</p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Origem</span>
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
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Arquivo</span>
          <input
            className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-slate-900"
            type="file"
            accept=".csv,.xlsx"
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
            <strong>{importResult.totalValid}</strong> validos e <strong>{importResult.totalInvalid}</strong> invalidos em{" "}
            <strong>{importResult.importedMonths.join(", ")}</strong>.
          </p>
          {importResult.monthDetectedByDate && (
            <p className="mt-2 text-amber-100">
              Mes solicitado: {importResult.requestedMonthRef}. Meses reconhecidos: {importResult.importedMonths.join(", ")}.
            </p>
          )}
          {importResult.duplicates.length > 0 && (
            <p className="mt-2 text-textMuted">Duplicados ignorados: {importResult.duplicates.join(", ")}</p>
          )}
        </div>
      )}
    </article>
  </aside>
);

interface ManualSectionProps {
  selectedMonth: string;
  loadingMonthData: boolean;
  manualSearch: string;
  setManualSearch: Dispatch<SetStateAction<string>>;
  filteredManualRows: AprRow[];
  paginatedManualRows: AprRow[];
  manualPage: number;
  manualTotalPages: number;
  setManualPage: Dispatch<SetStateAction<number>>;
  startEditManual: (row: AprRow) => void;
  removeManual: (row: AprRow) => Promise<void>;
}

export const AprManualTableSection = ({
  selectedMonth,
  loadingMonthData,
  manualSearch,
  setManualSearch,
  filteredManualRows,
  paginatedManualRows,
  manualPage,
  manualTotalPages,
  setManualPage,
  startEditManual,
  removeManual
}: ManualSectionProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">Tabela manual</h3>
        <p className="text-sm text-textMuted">Edicao isolada da base manual do mes {selectedMonth}.</p>
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
        <p>Pagina {manualPage} de {manualTotalPages} | Total {filteredManualRows.length}</p>
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
);

interface ManualFormProps {
  manualForm: AprManualFormState;
  setManualForm: ManualFormSetter;
  visibleSubjectSuggestions: UseAprPageControllerResult["visibleSubjectSuggestions"];
  visibleCollaboratorSuggestions: UseAprPageControllerResult["visibleCollaboratorSuggestions"];
  savingManual: boolean;
  resetManualForm: () => void;
  saveManual: () => Promise<void>;
}

export const AprManualFormSection = ({
  manualForm,
  setManualForm,
  visibleSubjectSuggestions,
  visibleCollaboratorSuggestions,
  savingManual,
  resetManualForm,
  saveManual
}: ManualFormProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">
          {manualForm.id ? "Editar lancamento" : "Novo lancamento"}
        </h3>
        <p className="text-sm text-textMuted">CRUD manual sem tocar em outros fluxos do sistema.</p>
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
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">External ID</span>
        <input
          id="apr-manual-external-id"
          className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          value={manualForm.external_id}
          onChange={(event) => setManualForm((current) => ({ ...current, external_id: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-opened-on">
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Data de abertura</span>
        <input
          id="apr-manual-opened-on"
          className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          type="date"
          value={manualForm.opened_on}
          onChange={(event) => setManualForm((current) => ({ ...current, opened_on: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-subject">
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Assunto</span>
        <input
          id="apr-manual-subject"
          className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          list="apr-subject-suggestions"
          value={manualForm.subject}
          onChange={(event) => setManualForm((current) => ({ ...current, subject: event.target.value }))}
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
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Colaborador</span>
        <input
          id="apr-manual-collaborator"
          className="w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          list="apr-collaborator-suggestions"
          value={manualForm.collaborator}
          onChange={(event) => setManualForm((current) => ({ ...current, collaborator: event.target.value }))}
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
        {savingManual ? "Salvando..." : manualForm.id ? "Atualizar lancamento" : "Criar lancamento"}
      </button>
    </div>
  </article>
);

interface AuditSectionProps {
  auditStatus: string;
  auditSearch: string;
  setAuditSearch: Dispatch<SetStateAction<string>>;
  divergentAuditRows: AprDivergentAuditRow[];
  filteredAuditRows: AprDivergentAuditRow[];
  paginatedAuditRows: AprDivergentAuditRow[];
  auditPage: number;
  auditTotalPages: number;
  setAuditPage: Dispatch<SetStateAction<number>>;
  exportAuditPdf: () => void;
}

export const AprAuditSection = ({
  auditStatus,
  auditSearch,
  setAuditSearch,
  divergentAuditRows,
  filteredAuditRows,
  paginatedAuditRows,
  auditPage,
  auditTotalPages,
  setAuditPage,
  exportAuditPdf
}: AuditSectionProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">Audit / divergencias</h3>
        <p className="text-sm text-textMuted">{filteredAuditRows.length} divergencias entre sistema e manual.</p>
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
        <span className="rounded-full bg-panelAlt px-3 py-1 text-xs text-textMuted">{auditStatus}</span>
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
          <div key={item.externalId} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-textMain">{item.externalId}</strong>
              <span className="text-xs text-textMuted">{item.status}</span>
            </div>
            <p className="mt-2 text-xs text-textMuted">Assunto: {item.subject}</p>
            <p className="mt-2 text-xs text-textMuted">Nome do colaborador: {item.collaborator}</p>
          </div>
        ))
      )}
    </div>

    {filteredAuditRows.length > 0 && (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-textMuted">
        <p>Pagina {auditPage} de {auditTotalPages} | Total {filteredAuditRows.length}</p>
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
);

interface HistorySectionProps {
  history: AprHistoryResponse;
  historySource: AprSourceType;
  setHistorySource: Dispatch<SetStateAction<AprSourceType>>;
  historySearch: string;
  setHistorySearch: Dispatch<SetStateAction<string>>;
  filteredHistoryRows: AprHistoryResponse["details"];
}

export const AprHistorySection = ({
  history,
  historySource,
  setHistorySource,
  historySearch,
  setHistorySearch,
  filteredHistoryRows
}: HistorySectionProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">History</h3>
        <p className="text-sm text-textMuted">Comparacao com {history.previousMonthRef || "mes anterior"}.</p>
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
        <p className="mt-1 font-display text-xl text-textMain">{history.summary.semAlteracao}</p>
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
          <div key={item.externalId} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-textMain">{item.externalId}</strong>
              <span className="text-xs text-textMuted">{item.status}</span>
            </div>
            <p className="mt-2 text-xs text-textMuted">
              Atual: {item.current?.subject ?? "ausente"} | Anterior: {item.previous?.subject ?? "ausente"}
            </p>
            {item.changed.length > 0 && (
              <p className="mt-2 text-xs text-amber-100">Mudancas: {item.changed.join(", ")}</p>
            )}
          </div>
        ))
      )}
    </div>
  </article>
);

interface SummarySectionProps {
  selectedMonth: string;
  orderedMonths: AprMonthItem[];
  summary: UseAprPageControllerResult["summary"];
  historySource: AprSourceType;
}

export const AprSummarySection = ({
  selectedMonth,
  orderedMonths,
  summary,
  historySource
}: SummarySectionProps) => (
  <section className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">Resumo do mes</h3>
        <p className="text-sm text-textMuted">Visao sintetica da referencia {formatMonthLabel(selectedMonth)}.</p>
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
);
