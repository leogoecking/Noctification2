import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("permite alternar para cadastro e enviar nome/login/senha", async () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(
      <LoginScreen mode="user" onLogin={onLogin} onRegister={onRegister} isLoading={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "maria" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });

    fireEvent.submit(screen.getByLabelText("Nome").closest("form") as HTMLFormElement);

    expect(onRegister).toHaveBeenCalledWith("Maria", "maria", "123456");
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("em modo admin fixa login admin e nao exibe aba de cadastro", () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(<LoginScreen mode="admin" onLogin={onLogin} isLoading={false} />);

    const loginInput = screen.getByLabelText("Login") as HTMLInputElement;

    expect(loginInput.value).toBe("admin");
    expect(loginInput.readOnly).toBe(true);
    expect(screen.queryByRole("button", { name: "Criar conta" })).toBeNull();
  });
});
