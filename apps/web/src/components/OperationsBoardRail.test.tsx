import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationsBoardRail } from "./OperationsBoardRail";
import { api } from "../lib/api";
import type { OperationsBoardEventItem, OperationsBoardMessageItem } from "../types";

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }),
  releaseSocket: vi.fn()
}));

vi.mock("../lib/api", () => ({
  api: {
    myOperationsBoard: vi.fn(),
    myOperationsBoardMessage: vi.fn(),
    createMyOperationsBoardMessage: vi.fn(),
    updateMyOperationsBoardMessage: vi.fn(),
    createMyOperationsBoardComment: vi.fn()
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
}));

const mockedApi = vi.mocked(api);

const buildBoardMessage = (
  overrides: Partial<OperationsBoardMessageItem> = {}
): OperationsBoardMessageItem => ({
  id: 1,
  title: "Turno da madrugada",
  body: "Monitorar o enlace principal",
  status: "active",
  category: "geral",
  authorUserId: 2,
  authorName: "Usuario",
  authorLogin: "user",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null,
  ...overrides
});

const buildBoardEvent = (
  overrides: Partial<OperationsBoardEventItem> = {}
): OperationsBoardEventItem => ({
  id: 10,
  messageId: 1,
  actorUserId: 2,
  actorName: "Usuario",
  actorLogin: "user",
  eventType: "created",
  body: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  ...overrides
});

describe("OperationsBoardRail", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      document.documentElement.classList.remove("dark");
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.myOperationsBoard.mockResolvedValue({
      messages: [
        buildBoardMessage(),
        buildBoardMessage({
          id: 2,
          title: "Falha no enlace",
          body: "Acionar plantao",
          category: "urgente"
        })
      ]
    });
    mockedApi.myOperationsBoardMessage.mockResolvedValue({
      message: buildBoardMessage(),
      timeline: [buildBoardEvent()]
    });
    mockedApi.createMyOperationsBoardMessage.mockResolvedValue({
      message: buildBoardMessage({
        id: 3,
        title: "Novo aviso",
        body: "Corpo novo",
        category: "info"
      })
    });
    mockedApi.updateMyOperationsBoardMessage.mockResolvedValue({
      message: buildBoardMessage({
        id: 1,
        title: "Turno revisado",
        body: "Monitorar o enlace secundario",
        category: "geral"
      })
    });
    mockedApi.createMyOperationsBoardComment.mockResolvedValue({
      event: buildBoardEvent({
        id: 11,
        eventType: "commented",
        body: "Acompanhando"
      })
    });
  });

  it("filtra o mural por categoria e abre o detalhe do recado", async () => {
    render(
      <OperationsBoardRail
        currentUserName="Usuario"
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(mockedApi.myOperationsBoard).toHaveBeenCalledWith("?status=active&limit=8")
    );
    expect(screen.getByText("Turno da madrugada")).toBeInTheDocument();
    expect(screen.getByText("Falha no enlace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Urgentes" }));

    expect(screen.queryByText("Turno da madrugada")).not.toBeInTheDocument();
    expect(screen.getByText("Falha no enlace")).toBeInTheDocument();

    mockedApi.myOperationsBoardMessage.mockResolvedValueOnce({
      message: buildBoardMessage({
        id: 2,
        title: "Falha no enlace",
        body: "Acionar plantao",
        category: "urgente"
      }),
      timeline: [buildBoardEvent({ messageId: 2 })]
    });

    fireEvent.click(screen.getByText("Falha no enlace"));

    await waitFor(() => expect(mockedApi.myOperationsBoardMessage).toHaveBeenCalledWith(2));
    expect(await screen.findByText("Comentario rapido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preparar edicao" })).toBeInTheDocument();
  });

  it("aplica a paleta escura nos avisos quando o tema dark esta ativo", async () => {
    document.documentElement.classList.add("dark");

    render(
      <OperationsBoardRail
        currentUserName="Usuario"
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(mockedApi.myOperationsBoard).toHaveBeenCalledWith("?status=active&limit=8")
    );

    expect(screen.getByRole("button", { name: /Turno da madrugada/i })).toHaveStyle({
      background: "#2B2924",
      border: "1.5px solid #60584B"
    });
  });

  it("publica novo aviso e permite editar e comentar um recado existente", async () => {
    const onToast = vi.fn();

    render(
      <OperationsBoardRail
        currentUserName="Usuario"
        onError={vi.fn()}
        onToast={onToast}
      />
    );

    await waitFor(() =>
      expect(mockedApi.myOperationsBoard).toHaveBeenCalledWith("?status=active&limit=8")
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Novo aviso" }));
    fireEvent.change(screen.getByLabelText("Titulo do aviso"), {
      target: { value: "Novo aviso" }
    });
    fireEvent.change(screen.getByLabelText("Corpo do aviso"), {
      target: { value: "Corpo novo" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar aviso" }));

    await waitFor(() =>
      expect(mockedApi.createMyOperationsBoardMessage).toHaveBeenCalledWith({
        title: "Novo aviso",
        body: "Corpo novo",
        category: "info"
      })
    );
    expect(await screen.findByText("Novo aviso")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Turno da madrugada"));

    await waitFor(() => expect(mockedApi.myOperationsBoardMessage).toHaveBeenCalledWith(1));
    fireEvent.click(await screen.findByRole("button", { name: "Preparar edicao" }));

    fireEvent.change(screen.getByDisplayValue("Turno da madrugada"), {
      target: { value: "Turno revisado" }
    });
    fireEvent.change(screen.getByDisplayValue("Monitorar o enlace principal"), {
      target: { value: "Monitorar o enlace secundario" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() =>
      expect(mockedApi.updateMyOperationsBoardMessage).toHaveBeenCalledWith(1, {
        title: "Turno revisado",
        body: "Monitorar o enlace secundario",
        category: "geral"
      })
    );

    fireEvent.change(screen.getByPlaceholderText("Atualizacao de Usuario..."), {
      target: { value: "Acompanhando" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar comentario" }));

    await waitFor(() =>
      expect(mockedApi.createMyOperationsBoardComment).toHaveBeenCalledWith(1, {
        body: "Acompanhando"
      })
    );
    expect(onToast).toHaveBeenCalledWith("Comentario registrado");
  });
});
