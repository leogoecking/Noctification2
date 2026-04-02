import {
  AprAuditSection,
  AprCollaboratorComparisonSection,
  AprHistorySection,
  AprImportSection,
  AprMonthReferenceSection,
  AprManualFormSection,
  AprManualTableSection,
} from "./AprPageSections";
import { useAprPageController } from "./useAprPageController";

interface AprPageProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AprPage = ({ onError, onToast }: AprPageProps) => {
  const {
    orderedMonths,
    selectedMonth,
    setSelectedMonth,
    historySource,
    setHistorySource,
    audit,
    history,
    manualForm,
    setManualForm,
    manualPage,
    setManualPage,
    auditPage,
    setAuditPage,
    manualSearch,
    setManualSearch,
    auditSearch,
    setAuditSearch,
    historySearch,
    setHistorySearch,
    importFiles,
    setImportFileForSource,
    importResult,
    loadingMonths,
    loadingMonthData,
    savingManual,
    uploading,
    collaboratorRiskBars,
    filteredManualRows,
    manualTotalPages,
    paginatedManualRows,
    divergentAuditRows,
    filteredAuditRows,
    auditTotalPages,
    paginatedAuditRows,
    filteredHistoryRows,
    visibleSubjectSuggestions,
    visibleCollaboratorSuggestions,
    resetManualForm,
    startEditManual,
    saveManual,
    removeManual,
    submitImport,
    exportAuditPdf
  } = useAprPageController({ onError, onToast });

  return (
    <section className="space-y-5">
      <header className="rounded-[1.5rem] bg-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
              APR module
            </p>
            <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-textMain">
              Controle de APR
            </h2>
            <p className="mt-2 text-sm text-textMuted">Mes ativo: {selectedMonth}</p>
          </div>
          <div className="rounded-xl bg-panelAlt px-4 py-3 text-sm text-textMuted">
            Historico: <strong className="capitalize text-textMain">{historySource}</strong>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
        <AprMonthReferenceSection
          orderedMonths={orderedMonths}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          loadingMonths={loadingMonths}
        />
        <AprImportSection
          importFiles={importFiles}
          importResult={importResult}
          uploading={uploading}
          setImportFileForSource={setImportFileForSource}
          submitImport={submitImport}
        />
      </div>

      <section className="space-y-4">
        <div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
              Operacao manual
            </p>
            <h3 className="mt-2 font-display text-2xl text-textMain">Base manual</h3>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr),minmax(18rem,0.82fr)]">
          <AprManualTableSection
            selectedMonth={selectedMonth}
            loadingMonthData={loadingMonthData}
            manualSearch={manualSearch}
            setManualSearch={setManualSearch}
            filteredManualRows={filteredManualRows}
            paginatedManualRows={paginatedManualRows}
            manualPage={manualPage}
            manualTotalPages={manualTotalPages}
            setManualPage={setManualPage}
            startEditManual={startEditManual}
            removeManual={removeManual}
          />

          <AprManualFormSection
            manualForm={manualForm}
            setManualForm={setManualForm}
            visibleSubjectSuggestions={visibleSubjectSuggestions}
            visibleCollaboratorSuggestions={visibleCollaboratorSuggestions}
            savingManual={savingManual}
            resetManualForm={resetManualForm}
            saveManual={saveManual}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
              Conferencia
            </p>
            <h3 className="mt-2 font-display text-2xl text-textMain">Divergencias e historico</h3>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AprAuditSection
            auditStatus={audit.summary.statusGeral}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            divergentAuditRows={divergentAuditRows}
            filteredAuditRows={filteredAuditRows}
            paginatedAuditRows={paginatedAuditRows}
            auditPage={auditPage}
            auditTotalPages={auditTotalPages}
            setAuditPage={setAuditPage}
            exportAuditPdf={exportAuditPdf}
          />

          <AprHistorySection
            history={history}
            historySource={historySource}
            setHistorySource={setHistorySource}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            filteredHistoryRows={filteredHistoryRows}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
            Colaboradores
          </p>
          <h3 className="mt-2 font-display text-2xl text-textMain">Leitura por colaborador</h3>
        </div>

        <AprCollaboratorComparisonSection collaboratorRiskBars={collaboratorRiskBars} />
      </section>
    </section>
  );
};
