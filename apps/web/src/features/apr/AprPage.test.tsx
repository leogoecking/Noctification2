import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AprPage } from "./AprPage";
import { aprApi } from "./api";

vi.mock("./api", () => ({
  aprApi: {
    listMonths: vi.fn(),
    getMonthSummary: vi.fn(),
    getRows: vi.fn(),
    getAudit: vi.fn(),
    getHistory: vi.fn(),
    createManual: vi.fn(),
    updateManual: vi.fn(),
    deleteManual: vi.fn(),
    importRows: vi.fn()
  }
}));

const mockedAprApi = vi.mocked(aprApi);

const baseMonths = {
  months: [
    {
      id: 1,
      monthRef: "2026-03",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      manualCount: 1,
      systemCount: 1,
      lastManualImportAt: "2026-03-05T10:00:00.000Z",
      lastSystemImportAt: "2026-03-05T11:00:00.000Z"
    }
  ]
};

const baseSummary = {
  monthRef: "2026-03",
  previousMonthRef: "2026-02",
  manualCount: 1,
  systemCount: 1,
  uniqueCollaborators: 1,
  statusGeral: "Conferido" as const,
  audit: {
    totalSistema: 1,
    totalManual: 1,
    conferido: 1,
    soSistema: 0,
    soManual: 0,
    totalIds: 1,
    divergentes: 0
  },
  history: {
    sourceType: "manual" as const,
    totalAtual: 1,
    totalAnterior: 1,
    novo: 0,
    alterado: 0,
    semAlteracao: 1,
    totalIds: 1
  }
};

const baseRows = {
  monthRef: "2026-03",
  rows: [
    {
      id: 10,
      monthRef: "2026-03",
      sourceType: "manual" as const,
      externalId: "APR-001",
      openedOn: "2026-03-02",
      subject: "MAPEAMENTO",
      collaborator: "Felipe",
      rawPayload: null,
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z"
    }
  ]
};

const baseAudit = {
  monthRef: "2026-03",
  summary: {
    totalSistema: 1,
    totalManual: 1,
    conferido: 1,
    soSistema: 0,
    soManual: 0,
    totalIds: 1,
    statusGeral: "Conferido" as const,
    divergentes: 0
  },
  details: [
    {
      externalId: "APR-001",
      status: "Conferido" as const,
      changed: [],
      system: null,
      manual: null
    }
  ]
};

const baseHistory = {
  monthRef: "2026-03",
  previousMonthRef: "2026-02",
  sourceType: "manual" as const,
  summary: {
    totalAtual: 1,
    totalAnterior: 1,
    novo: 0,
    alterado: 0,
    semAlteracao: 1,
    totalIds: 1
  },
  details: [
    {
      externalId: "APR-001",
      status: "Sem alteração" as const,
      changed: [],
      current: null,
      previous: null
    }
  ]
};

describe("AprPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAprApi.listMonths.mockResolvedValue(baseMonths);
    mockedAprApi.getMonthSummary.mockResolvedValue(baseSummary);
    mockedAprApi.getRows.mockResolvedValue(baseRows);
    mockedAprApi.getAudit.mockResolvedValue(baseAudit);
    mockedAprApi.getHistory.mockResolvedValue(baseHistory);
  });

  it("carrega meses, resumo e tabela manual", async () => {
    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedAprApi.listMonths).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedAprApi.getMonthSummary).toHaveBeenCalledWith("2026-03", "manual"));

    expect(screen.getByText("Auditoria de producao rural")).toBeInTheDocument();
    expect(screen.getAllByText("APR-001")).toHaveLength(3);
    expect(screen.getByText("Tabela manual")).toBeInTheDocument();
    expect(screen.getByText("Audit / divergencias")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("envia criação manual e recarrega a referência", async () => {
    const onToast = vi.fn();
    mockedAprApi.createManual.mockResolvedValue({
      row: baseRows.rows[0],
      savedMonthRef: "2026-03",
      moved: false
    });

    render(<AprPage onError={vi.fn()} onToast={onToast} />);

    await waitFor(() => expect(mockedAprApi.getRows).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("External ID"), { target: { value: "APR-020" } });
    fireEvent.change(screen.getByLabelText("Data de abertura"), { target: { value: "2026-03-15" } });
    fireEvent.change(screen.getByLabelText("Assunto"), { target: { value: "Podas" } });
    fireEvent.change(screen.getByLabelText("Colaborador"), { target: { value: "Renan" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar lancamento" }));

    await waitFor(() =>
      expect(mockedAprApi.createManual).toHaveBeenCalledWith("2026-03", {
        id: null,
        external_id: "APR-020",
        opened_on: "2026-03-15",
        subject: "Podas",
        collaborator: "Renan"
      })
    );
    expect(onToast).toHaveBeenCalledWith("Lancamento criado");
  });

  it("envia importação com arquivo selecionado", async () => {
    const onToast = vi.fn();
    mockedAprApi.importRows.mockResolvedValue({
      monthRef: "2026-03",
      sourceType: "manual",
      fileName: "apr.csv",
      totalValid: 1,
      totalInvalid: 0,
      duplicates: [],
      invalid: []
    });

    render(<AprPage onError={vi.fn()} onToast={onToast} />);

    await waitFor(() => expect(mockedAprApi.getRows).toHaveBeenCalled());

    const file = new File(["ID;Data de abertura;Assunto;Colaborador"], "apr.csv", {
      type: "text/csv"
    });

    fireEvent.change(screen.getByLabelText("Arquivo"), {
      target: { files: [file] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar arquivo" }));

    await waitFor(() => expect(mockedAprApi.importRows).toHaveBeenCalledWith("manual", file, "2026-03"));
    expect(onToast).toHaveBeenCalledWith("Importacao APR concluida");
  });
});
