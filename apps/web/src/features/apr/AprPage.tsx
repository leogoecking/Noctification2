import {
  AprAuditSection,
  AprCollaboratorComparisonSection,
  AprHistorySection,
  AprManualFormSection,
  AprManualTableSection,
  AprSidebar
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
    importSource,
    setImportSource,
    setImportFile,
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
    <section className="space-y-6">
      <header className="rounded-[1.5rem] bg-panelAlt/80 p-6 shadow-glow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">APR module</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-textMain">Controle de APR</h2>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              Modulo isolado para referencia mensal, conferencia manual e historico.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-outlineSoft bg-panel px-4 py-2 text-sm text-textMuted">
              Referencia mensal isolada
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[18rem,1fr]">
        <AprSidebar
          orderedMonths={orderedMonths}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          loadingMonths={loadingMonths}
          importSource={importSource}
          setImportSource={setImportSource}
          setImportFile={setImportFile}
          importResult={importResult}
          uploading={uploading}
          submitImport={submitImport}
        />

        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
            <AprCollaboratorComparisonSection collaboratorRiskBars={collaboratorRiskBars} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
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
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
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
          </section>
        </div>
      </div>
    </section>
  );
};
