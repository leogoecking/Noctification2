import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  baseAudit,
  baseCollaborators,
  baseHistory,
  baseMonths,
  baseRows,
  baseSubjects,
  baseSummary,
  divergentAudit
} from "../../test/aprFixtures";
import { AprPage } from "./AprPage";
import { aprApi } from "./api";

vi.mock("./api", () => ({
  aprApi: {
    listCollaborators: vi.fn(),
    listSubjects: vi.fn(),
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

describe("AprPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAprApi.listCollaborators.mockResolvedValue(baseCollaborators);
    mockedAprApi.listSubjects.mockResolvedValue(baseSubjects);
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

    expect(screen.getByText("Controle de APR")).toBeInTheDocument();
    expect(screen.getAllByText("APR-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tabela manual")).toBeInTheDocument();
    expect(screen.getByText("Audit / divergencias")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Comparativo por colaborador")).toBeInTheDocument();
    expect(screen.getByText("APRs divergentes")).toBeInTheDocument();
    expect(screen.getAllByText("Felipe").length).toBeGreaterThan(0);
    expect(mockedAprApi.listSubjects).toHaveBeenCalledTimes(1);
    expect(mockedAprApi.listCollaborators).toHaveBeenCalledTimes(1);
  });

  it("monta o grafico da matrix com colaboradores vindos de divergencias", async () => {
    mockedAprApi.getAudit.mockResolvedValue(divergentAudit);

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    const matrixSection = screen.getByText("APR por colaborador").closest("article");
    expect(matrixSection).not.toBeNull();

    const scoped = within(matrixSection as HTMLElement);
    await waitFor(() => expect(scoped.getByRole("button", { name: /RENAN/i })).toBeInTheDocument());
    fireEvent.click(scoped.getByRole("button", { name: /RENAN/i }));
    expect(scoped.getAllByText("RENAN").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("Divergente").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("Sistema").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(scoped.getByText("Detalhe por ID comparando presença em cada origem.")).toBeInTheDocument();
    expect(scoped.getAllByText(/Presente|Ausente/).length).toBeGreaterThan(0);
  });

  it("marca colaborador como conferido quando o apr está conferido", async () => {
    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedAprApi.getAudit).toHaveBeenCalled());

    const matrixSection = screen.getByText("APR por colaborador").closest("article");
    expect(matrixSection).not.toBeNull();

    const scoped = within(matrixSection as HTMLElement);
    fireEvent.click(scoped.getByRole("button", { name: /Felipe/i }));
    expect(scoped.getAllByText("Felipe").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("Consistente").length).toBeGreaterThan(0);
  });

  it("agrupa colaborador novo mesmo com variacao de caixa no nome", async () => {
    mockedAprApi.getAudit.mockResolvedValue({
      ...divergentAudit,
      details: [
        {
          externalId: "400001",
          status: "Só no sistema" as const,
          changed: [],
          system: {
            ...baseRows.rows[0],
            sourceType: "system" as const,
            externalId: "400001",
            subject: "PODA",
            collaborator: "renan"
          },
          manual: null
        },
        {
          externalId: "400002",
          status: "Só no manual" as const,
          changed: [],
          system: null,
          manual: {
            ...baseRows.rows[0],
            externalId: "400002",
            subject: "MAPEAMENTO",
            collaborator: "RENAN"
          }
        }
      ]
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedAprApi.getAudit).toHaveBeenCalled());

    const matrixSection = screen.getByText("APR por colaborador").closest("article");
    expect(matrixSection).not.toBeNull();

    const scoped = within(matrixSection as HTMLElement);
    const collaboratorButtons = scoped.getAllByRole("button", { name: /renan/i });
    expect(collaboratorButtons).toHaveLength(1);

    fireEvent.click(collaboratorButtons[0]);
    expect(scoped.getByText("2 ID(s) unicos")).toBeInTheDocument();
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

    fireEvent.change(document.getElementById("apr-manual-external-id") as HTMLInputElement, {
      target: { value: "APR-020" }
    });
    fireEvent.change(document.getElementById("apr-manual-opened-on") as HTMLInputElement, {
      target: { value: "2026-03-15" }
    });
    fireEvent.change(document.getElementById("apr-manual-subject") as HTMLInputElement, {
      target: { value: "Podas" }
    });
    fireEvent.change(document.getElementById("apr-manual-collaborator") as HTMLInputElement, {
      target: { value: "Renan" }
    });
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

  it("pagina a tabela manual com 5 registros por pagina", async () => {
    mockedAprApi.getRows.mockResolvedValue({
      monthRef: "2026-03",
      rows: Array.from({ length: 6 }, (_, index) => ({
        ...baseRows.rows[0],
        id: index + 1,
        externalId: `APR-00${index + 1}`,
        subject: `ASSUNTO ${index + 1}`
      }))
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedAprApi.getRows).toHaveBeenCalled());

    const manualTableBody = screen.getByText("Tabela manual").closest("article")?.querySelector("tbody");
    expect(manualTableBody).not.toBeNull();

    expect(screen.getByText("Pagina 1 de 2 | Total 6")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).getByText("APR-001")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).getByText("APR-005")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).queryByText("APR-006")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));

    expect(screen.getByText("Pagina 2 de 2 | Total 6")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).getByText("APR-006")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).queryByText("APR-001")).not.toBeInTheDocument();
  });

  it("filtra rapidamente a tabela manual por assunto e colaborador", async () => {
    mockedAprApi.getRows.mockResolvedValue({
      monthRef: "2026-03",
      rows: [
        baseRows.rows[0],
        {
          ...baseRows.rows[0],
          id: 11,
          externalId: "APR-002",
          subject: "PODA",
          collaborator: "Renan"
        }
      ]
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedAprApi.getRows).toHaveBeenCalled());

    const manualTableBody = screen.getByText("Tabela manual").closest("article")?.querySelector("tbody");
    expect(manualTableBody).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Busca rapida na tabela manual"), {
      target: { value: "renan" }
    });

    expect(within(manualTableBody as HTMLElement).getByText("APR-002")).toBeInTheDocument();
    expect(within(manualTableBody as HTMLElement).queryByText("APR-001")).not.toBeInTheDocument();
    expect(screen.getByText("Pagina 1 de 1 | Total 1")).toBeInTheDocument();
  });

  it("envia importação com arquivo selecionado", async () => {
    const onToast = vi.fn();
    mockedAprApi.importRows.mockResolvedValue({
      monthRef: "2026-03",
      requestedMonthRef: "2026-03",
      importedMonths: ["2026-03"],
      monthDetectedByDate: false,
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

  it("exporta relatorio de divergentes em nova aba de visualizacao sem imprimir automaticamente", async () => {
    mockedAprApi.getAudit.mockResolvedValue(divergentAudit);
    const createObjectUrl = vi.fn(() => "blob:apr-report");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectUrl,
      configurable: true
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectUrl,
      configurable: true
    });
    const click = vi.fn();
    let createdLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        createdLink = element as HTMLAnchorElement;
        Object.defineProperty(element, "click", {
          value: click,
          configurable: true
        });
      }
      return element;
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));

    await waitFor(() => expect(createObjectUrl).toHaveBeenCalled());
    const firstCreateObjectUrlCall = createObjectUrl.mock.calls[0] as unknown as [unknown];
    const reportBlob = firstCreateObjectUrlCall[0];
    expect(reportBlob).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalled();
    expect(createdLink).not.toBeNull();
    const link = createdLink as unknown as HTMLAnchorElement;
    expect(link.href).toContain("blob:apr-report");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });

  it("mostra nas divergencias apenas id, status, assunto e colaborador", async () => {
    mockedAprApi.getAudit.mockResolvedValue(divergentAudit);

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Audit / divergencias")).toBeInTheDocument());

    expect(screen.getByText("Assunto: PODA")).toBeInTheDocument();
    expect(screen.getByText("Nome do colaborador: RENAN")).toBeInTheDocument();
    expect(screen.getByText("Assunto: MAPEAMENTO")).toBeInTheDocument();
    expect(screen.getByText("Nome do colaborador: FELIPE")).toBeInTheDocument();
    expect(screen.getByText("2 divergencias entre sistema e manual.")).toBeInTheDocument();
    expect(screen.queryByText(/Sistema:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manual:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Campos alterados:/)).not.toBeInTheDocument();
  });

  it("lista somente divergencias reais e pagina 5 por vez", async () => {
    mockedAprApi.getAudit.mockResolvedValue({
      monthRef: "2026-03",
      summary: {
        totalSistema: 7,
        totalManual: 7,
        conferido: 1,
        soSistema: 3,
        soManual: 3,
        totalIds: 7,
        statusGeral: "Divergente" as const,
        divergentes: 6
      },
      details: [
        {
          externalId: "APR-000",
          status: "Conferido" as const,
          changed: [],
          system: baseRows.rows[0],
          manual: baseRows.rows[0]
        },
        ...Array.from({ length: 6 }, (_, index) => ({
          externalId: `APR-10${index}`,
          status: (index % 2 === 0 ? "Só no sistema" : "Só no manual") as "Só no sistema" | "Só no manual",
          changed: [],
          system:
            index % 2 === 0
              ? {
                  ...baseRows.rows[0],
                  id: 100 + index,
                  externalId: `APR-10${index}`,
                  subject: `ASSUNTO ${index}`,
                  collaborator: `COLAB ${index}`
                }
              : null,
          manual:
            index % 2 === 0
              ? null
              : {
                  ...baseRows.rows[0],
                  id: 200 + index,
                  externalId: `APR-10${index}`,
                  subject: `ASSUNTO ${index}`,
                  collaborator: `COLAB ${index}`
                }
        }))
      ]
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("6 divergencias entre sistema e manual.")).toBeInTheDocument());

    const auditArticle = screen.getByText("Audit / divergencias").closest("article");
    expect(auditArticle).not.toBeNull();

    expect(screen.queryByText("APR-000")).not.toBeInTheDocument();
    expect(screen.getByText("Pagina 1 de 2 | Total 6")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).getByText("APR-100")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).getByText("APR-104")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).queryByText("APR-105")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina divergencias" }));

    expect(screen.getByText("Pagina 2 de 2 | Total 6")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).getByText("APR-105")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).queryByText("APR-100")).not.toBeInTheDocument();
  });

  it("filtra rapidamente as divergencias por texto", async () => {
    mockedAprApi.getAudit.mockResolvedValue({
      monthRef: "2026-03",
      summary: {
        totalSistema: 2,
        totalManual: 1,
        conferido: 0,
        soSistema: 1,
        soManual: 1,
        totalIds: 2,
        statusGeral: "Divergente" as const,
        divergentes: 2
      },
      details: divergentAudit.details
    });

    render(<AprPage onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("2 divergencias entre sistema e manual.")).toBeInTheDocument());

    const auditArticle = screen.getByText("Audit / divergencias").closest("article");
    expect(auditArticle).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Busca rapida nas divergencias"), {
      target: { value: "235270" }
    });

    expect(within(auditArticle as HTMLElement).getByText("235270")).toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).queryByText("235269")).not.toBeInTheDocument();
    expect(within(auditArticle as HTMLElement).getByText("Pagina 1 de 1 | Total 1")).toBeInTheDocument();
  });
});
