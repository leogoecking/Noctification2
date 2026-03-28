import { formatMonthLabel } from "./aprPageModel";
import {
  AprAuditSection,
  AprHistorySection,
  AprManualFormSection,
  AprManualTableSection,
  AprSidebar,
  AprSummarySection
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
    summary,
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
    monthStats,
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

          <section className="grid gap-4 xl:grid-cols-2">
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

          <AprSummarySection
            selectedMonth={selectedMonth}
            orderedMonths={orderedMonths}
            summary={summary}
            historySource={historySource}
          />
        </div>
      </div>
    </section>
  );
};
