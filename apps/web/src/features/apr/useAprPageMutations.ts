import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import type { AprManualFormState } from "./aprPageModel";
import type { AprSourceType } from "./types";

interface UseAprPageMutationsParams {
  onError: (message: string) => void;
  onToast: (message: string) => void;
  selectedMonth: string;
  setSelectedMonth: Dispatch<SetStateAction<string>>;
  manualForm: AprManualFormState;
  manualFormId: number | null;
  resetManualForm: () => void;
  loadMonths: () => Promise<void>;
  loadCatalogData: () => Promise<void>;
  loadMonthData: () => Promise<void>;
}

export const useAprPageMutations = ({
  onError,
  onToast,
  selectedMonth,
  setSelectedMonth,
  manualForm,
  manualFormId,
  resetManualForm,
  loadMonths,
  loadCatalogData,
  loadMonthData
}: UseAprPageMutationsParams) => {
  const [importFiles, setImportFiles] = useState<Record<AprSourceType, File | null>>({
    manual: null,
    system: null
  });
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof aprApi.importRows>> | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refreshAfterMutation = useCallback(
    async (monthRef?: string) => {
      await Promise.all([loadMonths(), loadCatalogData()]);
      if (monthRef && monthRef !== selectedMonth) {
        setSelectedMonth(monthRef);
        return;
      }

      await loadMonthData();
    },
    [loadCatalogData, loadMonthData, loadMonths, selectedMonth, setSelectedMonth]
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
    async (row: { id: number }) => {
      try {
        await aprApi.deleteManual(selectedMonth, row.id);
        if (manualFormId === row.id) {
          resetManualForm();
        }
        await refreshAfterMutation();
        onToast("Lancamento removido");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao remover lancamento");
      }
    },
    [manualFormId, onError, onToast, refreshAfterMutation, resetManualForm, selectedMonth]
  );

  const setImportFileForSource = useCallback((source: AprSourceType, file: File | null) => {
    setImportFiles((current) => ({
      ...current,
      [source]: file
    }));
  }, []);

  const submitImport = useCallback(async (source: AprSourceType) => {
    const file = importFiles[source];

    if (!file) {
      onError("Selecione um arquivo para importar");
      return;
    }

    setUploading(true);

    try {
      const response = await aprApi.importRows(source, file, selectedMonth);
      setImportResult(response);
      setImportFiles((current) => ({
        ...current,
        [source]: null
      }));
      await refreshAfterMutation(response.monthRef);
      onToast("Importacao APR concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao importar arquivo APR");
    } finally {
      setUploading(false);
    }
  }, [importFiles, onError, onToast, refreshAfterMutation, selectedMonth]);

  return {
    importFiles,
    importResult,
    savingManual,
    uploading,
    setImportFileForSource,
    saveManual,
    removeManual,
    submitImport
  };
};
