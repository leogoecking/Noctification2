import type { Dispatch, SetStateAction } from "react";
import type { AprManualFormState } from "./aprPageModel";
import type { UseAprPageControllerResult } from "./aprPageControllerTypes";
import type { AprRow } from "./types";

type ManualFormSetter = Dispatch<SetStateAction<AprManualFormState>>;

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
        <span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">External ID</span>
        <input
          id="apr-manual-external-id"
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          value={manualForm.external_id}
          onChange={(event) => setManualForm((current) => ({ ...current, external_id: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-opened-on">
        <span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">Data de abertura</span>
        <input
          id="apr-manual-opened-on"
          className="w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain outline-none"
          type="date"
          value={manualForm.opened_on}
          onChange={(event) => setManualForm((current) => ({ ...current, opened_on: event.target.value }))}
        />
      </label>

      <label className="block" htmlFor="apr-manual-subject">
        <span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">Assunto</span>
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
        <span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">Colaborador</span>
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
