import { describe, expect, it, vi } from "vitest";
import { notifySocketErrorOnce, resetSocketErrorStateForTests } from "./socketError";

describe("socketError", () => {
  it("deduplica erros de socket dentro da janela curta", () => {
    resetSocketErrorStateForTests();
    const onError = vi.fn();

    notifySocketErrorOnce(onError, "Falha");
    notifySocketErrorOnce(onError, "Falha");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("Falha");
  });
});
