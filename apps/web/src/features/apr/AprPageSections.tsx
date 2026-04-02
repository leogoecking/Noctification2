import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatMonthLabel,
  type AprManualFormState,
  type AprCollaboratorRiskBar,
  type AprDivergentAuditRow
} from "./aprPageModel";
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
}

export const AprMonthReferenceSection = ({
  orderedMonths,
  selectedMonth,
  setSelectedMonth,
  loadingMonths
}: SidebarProps) => (
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
        Referencia
      </p>
      <h3 className="mt-2 font-display text-2xl text-textMain">Mes ativo</h3>
      <p className="mt-1 text-sm text-textMuted">
        Escolha o mês de trabalho e navegue rapidamente entre referências já existentes.
      </p>
    </div>

    <div className="mb-4">
      <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted" htmlFor="apr-month-input">
        Referencia manual
      </label>
      <input
        id="apr-month-input"
        className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
        type="month"
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
      />
    </div>

    <div className="flex flex-wrap gap-2">
      {orderedMonths.length === 0 && !loadingMonths ? (
        <p className="w-full rounded-xl border border-dashed border-outlineSoft px-3 py-4 text-sm text-textMuted">
          Nenhum mes APR persistido ainda. Voce pode comecar pelo mes atual.
        </p>
      ) : (
        orderedMonths.map((month) => (
          <button
            key={month.monthRef}
            type="button"
            className={`rounded-xl border px-3 py-2 text-left transition ${
              month.monthRef === selectedMonth
                ? "border-accent bg-accent/10 text-textMain"
                : "border-outlineSoft bg-panelAlt text-textMuted hover:text-textMain"
            }`}
            onClick={() => setSelectedMonth(month.monthRef)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{formatMonthLabel(month.monthRef)}</span>
              <span className="text-xs">{month.monthRef}</span>
            </div>
          </button>
        ))
      )}
    </div>
  </article>
);

interface ImportSectionProps {
  importFiles: Record<AprSourceType, File | null>;
  importResult: UseAprPageControllerResult["importResult"];
  uploading: boolean;
  setImportFileForSource: (source: AprSourceType, file: File | null) => void;
  submitImport: (source: AprSourceType) => Promise<void>;
}

const getImportCardCopy = (
  source: AprSourceType
): { title: string; description: string; inputLabel: string; buttonLabel: string } =>
  source === "manual"
    ? {
        title: "Importacao manual",
        description: "Envie a base consolidada do mês para alimentar a visão manual.",
        inputLabel: "Arquivo manual",
        buttonLabel: "Importar manual"
      }
    : {
        title: "Importacao do sistema",
        description: "Envie o extrato do sistema para comparar com a base manual.",
        inputLabel: "Arquivo do sistema",
        buttonLabel: "Importar sistema"
      };

const AprImportCard = ({
  source,
  importFiles,
  importResult,
  uploading,
  setImportFileForSource,
  submitImport
}: ImportSectionProps & { source: AprSourceType }) => {
  const copy = getImportCardCopy(source);
  const selectedFile = importFiles[source];
  const resultForSource = importResult?.sourceType === source ? importResult : null;

  return (
    <article className="rounded-[1.25rem] bg-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-textMain">{copy.title}</h3>
          <p className="mt-1 text-sm text-textMuted">{copy.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">
            {copy.inputLabel}
          </span>
          <input
            aria-label={copy.inputLabel}
            className="block w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-white"
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => setImportFileForSource(source, event.target.files?.[0] ?? null)}
          />
        </label>

        {selectedFile ? (
          <p className="text-xs text-textMuted">Selecionado: {selectedFile.name}</p>
        ) : null}

        <button
          className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={uploading || !selectedFile}
          onClick={() => void submitImport(source)}
        >
          {uploading && selectedFile ? "Importando..." : copy.buttonLabel}
        </button>
      </div>

      {resultForSource ? (
        <div className="mt-4 rounded-xl bg-panelAlt p-3 text-sm text-textMain">
          <p>
            <strong>{resultForSource.totalValid}</strong> validos e{" "}
            <strong>{resultForSource.totalInvalid}</strong> invalidos em{" "}
            <strong>{resultForSource.importedMonths.join(", ")}</strong>.
          </p>
          {resultForSource.monthDetectedByDate ? (
            <p className="mt-2 text-warning">
              Mes solicitado: {resultForSource.requestedMonthRef}. Meses reconhecidos:{" "}
              {resultForSource.importedMonths.join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export const AprImportSection = ({
  importFiles,
  importResult,
  uploading,
  setImportFileForSource,
  submitImport
}: ImportSectionProps) => (
  <section className="space-y-4">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
        Importacao
      </p>
      <h3 className="mt-2 font-display text-2xl text-textMain">Bases separadas</h3>
      <p className="mt-1 text-sm text-textMuted">
        Manual e sistema ficam em áreas independentes para reduzir ruído e evitar confusão no envio.
      </p>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <AprImportCard
        source="manual"
        importFiles={importFiles}
        importResult={importResult}
        uploading={uploading}
        setImportFileForSource={setImportFileForSource}
        submitImport={submitImport}
      />
      <AprImportCard
        source="system"
        importFiles={importFiles}
        importResult={importResult}
        uploading={uploading}
        setImportFileForSource={setImportFileForSource}
        submitImport={submitImport}
      />
    </div>
  </section>
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
  <article className="rounded-[1.25rem] bg-panel p-5">
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
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
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
              <tr key={row.id} className="border-t border-outlineSoft/60">
                <td className="py-3 pr-4 font-medium text-textMain">{row.externalId}</td>
                <td className="py-3 pr-4 text-textMuted">{row.openedOn}</td>
                <td className="py-3 pr-4 text-textMain">{row.subject}</td>
                <td className="py-3 pr-4 text-textMuted">{row.collaborator}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMain"
                      type="button"
                      onClick={() => startEditManual(row)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger"
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outlineSoft/60 pt-4 text-xs text-textMuted">
        <p>Pagina {manualPage} de {manualTotalPages} | Total {filteredManualRows.length}</p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={manualPage <= 1}
            onClick={() => setManualPage((current) => Math.max(1, current - 1))}
          >
            Pagina anterior
          </button>
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
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
  <article className="rounded-[1.25rem] bg-panel p-5 xl:sticky xl:top-24">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">
          {manualForm.id ? "Editar lancamento" : "Novo lancamento"}
        </h3>
        <p className="text-sm text-textMuted">CRUD manual sem tocar em outros fluxos do sistema.</p>
      </div>
      {manualForm.id && (
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMuted"
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
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          value={manualForm.external_id}
          onChange={(event) => setManualForm((current) => ({ ...current, external_id: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-opened-on">
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Data de abertura</span>
        <input
          id="apr-manual-opened-on"
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          type="date"
          value={manualForm.opened_on}
          onChange={(event) => setManualForm((current) => ({ ...current, opened_on: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-subject">
        <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-textMuted">Assunto</span>
        <input
          id="apr-manual-subject"
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
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
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
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
        className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">Audit / divergencias</h3>
        <p className="text-sm text-textMuted">{filteredAuditRows.length} divergencias entre sistema e manual.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
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
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
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
          <div key={item.externalId} className="rounded-[1.1rem] bg-panelAlt p-4">
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outlineSoft/60 pt-4 text-xs text-textMuted">
        <p>Pagina {auditPage} de {auditTotalPages} | Total {filteredAuditRows.length}</p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={auditPage <= 1}
            onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
          >
            Pagina anterior divergencias
          </button>
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMain disabled:cursor-not-allowed disabled:opacity-60"
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
}: HistorySectionProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-[1.25rem] bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-textMain">History</h3>
          <p className="text-sm text-textMuted">Comparacao com {history.previousMonthRef || "mes anterior"}.</p>
        </div>
        <button
          className="rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Recolher" : "Expandir"}
        </button>
      </div>

      {expanded ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="grid flex-1 gap-3 md:grid-cols-3">
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
            <select
              className="rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
              value={historySource}
              onChange={(event) => setHistorySource(event.target.value as AprSourceType)}
            >
              <option value="manual">manual</option>
              <option value="system">system</option>
            </select>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <input
                className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
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
                <div key={item.externalId} className="rounded-[1.1rem] bg-panelAlt p-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-textMain">{item.externalId}</strong>
                    <span className="text-xs text-textMuted">{item.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-textMuted">
                    Atual: {item.current?.subject ?? "ausente"} | Anterior: {item.previous?.subject ?? "ausente"}
                  </p>
                  {item.changed.length > 0 && (
                    <p className="mt-2 text-xs text-warning">Mudancas: {item.changed.join(", ")}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </article>
  );
};

export const AprCollaboratorComparisonSection = ({
  collaboratorRiskBars
}: {
  collaboratorRiskBars: AprCollaboratorRiskBar[];
}) => {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const selectedBar =
    collaboratorRiskBars.find((item) => item.collaborator === selectedCollaborator) ?? null;
  const maxOriginCount = Math.max(
    1,
    ...collaboratorRiskBars.flatMap((item) => [item.systemCount, item.manualCount])
  );
  const totalDivergentAprs = collaboratorRiskBars.reduce((sum, item) => sum + item.divergentIds, 0);

  useEffect(() => {
    if (
      selectedCollaborator &&
      !collaboratorRiskBars.some((item) => item.collaborator === selectedCollaborator)
    ) {
      setSelectedCollaborator(null);
    }
  }, [collaboratorRiskBars, selectedCollaborator]);

  return (
    <article className="relative overflow-hidden rounded-[1.25rem] bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-textMuted">APR por colaborador</h3>
        <span className="rounded-md bg-panelAlt px-2 py-1 text-xs text-textMuted">Dados reais</span>
      </div>
      <div className="mt-4 rounded-[1.1rem] bg-panelAlt p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-textMuted">Comparativo por colaborador</h4>
          <span className="text-xs text-textMuted">Sistema x manual</span>
        </div>

        {collaboratorRiskBars.length === 0 ? (
          <p className="text-sm text-textMuted">Sem nomes de colaboradores suficientes para compor o grafico.</p>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3">
              <article className="rounded-xl bg-panel p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-textMuted">
                  APRs divergentes
                </p>
                <p className="mt-2 font-display text-2xl font-black text-danger">{totalDivergentAprs}</p>
              </article>
            </section>

            <section className="space-y-4">
              {collaboratorRiskBars.map((item) => {
                const isSelected = selectedBar?.collaborator === item.collaborator;
                const systemWidth = Math.max(12, Math.round((item.systemCount / maxOriginCount) * 100));
                const manualWidth = Math.max(12, Math.round((item.manualCount / maxOriginCount) * 100));

                return (
                  <button
                    key={item.collaborator}
                    type="button"
                    className={`w-full rounded-[1.1rem] border p-4 text-left transition ${
                      isSelected
                        ? "border-accent bg-panel shadow-glow"
                        : "border-outlineSoft bg-panel hover:border-accent/40"
                    }`}
                    onClick={() => setSelectedCollaborator(item.collaborator)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-textMain">{item.collaborator}</p>
                        <p className="text-xs text-textMuted">{item.uniqueIds} ID(s) unicos</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-textMuted">
                        {item.divergentIds} divergencia(s)
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-textMuted">
                          <span>Sistema</span>
                          <span>{item.systemCount}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-panelAlt">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${systemWidth}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-textMuted">
                          <span>Manual</span>
                          <span>{item.manualCount}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-panelAlt">
                          <div className="h-full rounded-full bg-warning" style={{ width: `${manualWidth}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            {selectedBar && (
              <section className="rounded-[1.1rem] bg-panel p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-semibold text-textMain">{selectedBar.collaborator}</h5>
                    <p className="text-xs text-textMuted">Detalhe por ID comparando presença em cada origem.</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-textMuted">
                    {selectedBar.divergentIds} divergencia(s) neste colaborador
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-textMuted">
                      <tr>
                        <th className="pb-2 pr-4">ID</th>
                        <th className="pb-2 pr-4">Assunto</th>
                        <th className="pb-2 pr-4">Sistema</th>
                        <th className="pb-2 pr-4">Manual</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBar.details.map((detail) => (
                        <tr
                          key={detail.externalId}
                          className={`border-t ${
                            detail.statusLabel === "Divergente"
                              ? "border-danger/30 bg-danger/10"
                              : "border-outlineSoft/60"
                          }`}
                        >
                          <td className="py-3 pr-4 font-medium text-textMain">{detail.externalId}</td>
                          <td className="py-3 pr-4 text-textMuted">{detail.subject}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                                detail.systemPresent ? "bg-accent/15 text-accent" : "bg-panelAlt text-textMuted"
                              }`}
                            >
                              {detail.systemPresent ? "Presente" : "Ausente"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                                detail.manualPresent ? "bg-warning/15 text-warning" : "bg-panelAlt text-textMuted"
                              }`}
                            >
                              {detail.manualPresent ? "Presente" : "Ausente"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={detail.statusLabel === "Divergente" ? "text-danger" : "text-success"}>
                              {detail.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
