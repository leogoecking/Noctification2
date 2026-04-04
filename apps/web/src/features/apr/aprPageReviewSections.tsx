import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { AprCollaboratorRiskBar, AprDivergentAuditRow } from "./aprPageModel";
import type { AprHistoryResponse, AprSourceType } from "./types";

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
                <p className="text-xs uppercase tracking-wide text-textMuted">Novos</p>
                <p className="mt-1 font-display text-xl text-textMain">{history.summary.novo}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">Alterados</p>
                <p className="mt-1 font-display text-xl text-textMain">{history.summary.alterado}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">Sem alteracao</p>
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
        <h3 className="text-xs font-bold uppercase tracking-widest text-textMuted">APR por colaborador</h3>
        <span className="rounded-md bg-panelAlt px-2 py-1 text-xs text-textMuted">Dados reais</span>
      </div>
      <div className="mt-4 rounded-[1.1rem] bg-panelAlt p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-textMuted">Comparativo por colaborador</h4>
          <span className="text-xs text-textMuted">Sistema x manual</span>
        </div>

        {collaboratorRiskBars.length === 0 ? (
          <p className="text-sm text-textMuted">Sem nomes de colaboradores suficientes para compor o grafico.</p>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3">
              <article className="rounded-xl bg-panel p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-textMuted">
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
                        ? "border-accent bg-panel shadow-sm"
                        : "border-outlineSoft bg-panel hover:border-accent/40"
                    }`}
                    onClick={() => setSelectedCollaborator(item.collaborator)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-textMain">{item.collaborator}</p>
                        <p className="text-xs text-textMuted">{item.uniqueIds} ID(s) unicos</p>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-textMuted">
                        {item.divergentIds} divergencia(s)
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-textMuted">
                          <span>Sistema</span>
                          <span>{item.systemCount}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-panelAlt">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${systemWidth}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-textMuted">
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
                  <p className="text-xs uppercase tracking-wide text-textMuted">
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
                              className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                                detail.systemPresent ? "bg-accent/15 text-accent" : "bg-panelAlt text-textMuted"
                              }`}
                            >
                              {detail.systemPresent ? "Presente" : "Ausente"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
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
