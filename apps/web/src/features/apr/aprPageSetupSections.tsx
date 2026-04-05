import type { Dispatch, SetStateAction } from "react";
import { formatMonthLabel } from "./aprPageModel";
import type { UseAprPageControllerResult } from "./aprPageControllerTypes";
import type { AprMonthItem, AprSourceType } from "./types";

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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
        Referencia
      </p>
      <h3 className="mt-2 font-display text-2xl text-textMain">Mes ativo</h3>
      <p className="mt-1 text-sm text-textMuted">
        Escolha o mês de trabalho e navegue rapidamente entre referências já existentes.
      </p>
    </div>

    <div className="mb-4">
      <label className="mb-1 block text-xs uppercase tracking-wide text-textMuted" htmlFor="apr-month-input">
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
          <span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">
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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
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
