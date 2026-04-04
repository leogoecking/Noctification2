import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPageTitle, normalizePath } from "./appShell";

describe("app shell helpers", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ENABLE_APR_MODULE", "false");
    vi.stubEnv("VITE_ENABLE_KML_POSTE_MODULE", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normaliza rotas desabilitadas para dashboard", () => {
    expect(normalizePath("/apr")).toBe("/");
    expect(normalizePath("/kml-postes")).toBe("/");
  });

  it("mantem rotas habilitadas quando os modulos estao ativos", () => {
    vi.stubEnv("VITE_ENABLE_APR_MODULE", "true");
    vi.stubEnv("VITE_ENABLE_KML_POSTE_MODULE", "true");

    expect(normalizePath("/apr")).toBe("/apr");
    expect(normalizePath("/kml-postes")).toBe("/kml-postes");
  });

  it("prioriza o titulo da rota antes do papel do usuario", () => {
    expect(
      getPageTitle("/apr", {
        id: 1,
        login: "admin",
        name: "Administrador",
        role: "admin"
      })
    ).toBe("APR");

    expect(
      getPageTitle("/notifications", {
        id: 2,
        login: "user",
        name: "Usuario",
        role: "user"
      })
    ).toBe("Todas as Notificacoes");
  });
});
