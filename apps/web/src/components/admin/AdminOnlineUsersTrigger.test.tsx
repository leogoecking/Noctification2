import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminOnlineUsersTrigger } from "./AdminOnlineUsersTrigger";

describe("AdminOnlineUsersTrigger", () => {
  it("abre o modal de usuarios online e permite atualizar e fechar", () => {
    const onRefreshOnlineUsers = vi.fn();

    render(
      <AdminOnlineUsersTrigger
        onlineUsers={[
          {
            id: 7,
            name: "Operador",
            login: "operador",
            role: "user",
            department: "Operacoes",
            jobTitle: "Analista"
          }
        ]}
        onlineSummary={{ admins: 1, operators: 1 }}
        lastOnlineRefreshAt="2026-03-21T12:00:00.000Z"
        loadingOnlineUsers={false}
        onRefreshOnlineUsers={onRefreshOnlineUsers}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Usuarios online" }));

    expect(screen.getByText("Usuarios conectados agora")).toBeInTheDocument();
    expect(screen.getByText("Operador")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(onRefreshOnlineUsers).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText("Usuarios conectados agora")).toBeNull();
  });
});
