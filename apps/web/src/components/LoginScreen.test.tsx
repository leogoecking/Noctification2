import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("permite alternar para cadastro e enviar nome/login/senha", async () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<LoginScreen onLogin={onLogin} onRegister={onRegister} isLoading={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "maria" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });

    fireEvent.submit(screen.getByLabelText("Nome").closest("form") as HTMLFormElement);

    expect(onRegister).toHaveBeenCalledWith("Maria", "maria", "123456");
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("exibe a aba de cadastro por padrao", () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(<LoginScreen onLogin={onLogin} isLoading={false} />);

    expect(screen.getByRole("button", { name: "Criar conta" })).toBeTruthy();
    const loginInput = screen.getByLabelText("Login") as HTMLInputElement;
    expect(loginInput.value).toBe("");
    expect(loginInput.readOnly).toBeFalsy();
  });
});
