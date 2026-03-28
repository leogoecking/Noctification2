import { describe, expect, it } from "vitest";
import { compareBases, compareMonthToPrevious } from "./index";

describe("apr-core compare", () => {
  it("audits system and manual rows", () => {
    const systemRows = [
      { ID: "1", dataAbertura: "2026-03-01", assunto: "MAPEAMENTO", colaborador: "Felipe" },
      { ID: "2", dataAbertura: "2026-03-02", assunto: "PODAS", colaborador: "Renan" }
    ];
    const manualRows = [
      { ID: "1", dataAbertura: "2026-03-01", assunto: "Mapeamento", colaborador: "Felipe" },
      { ID: "3", dataAbertura: "2026-03-03", assunto: "PODAS", colaborador: "Renan" }
    ];

    const result = compareBases(systemRows, manualRows);

    expect(result.summary).toEqual({
      totalSistema: 2,
      totalManual: 2,
      conferido: 1,
      soSistema: 1,
      soManual: 1,
      totalIds: 3
    });
    expect(result.details.map((detail) => [detail.ID, detail.status])).toEqual([
      ["1", "Conferido"],
      ["2", "Só no sistema"],
      ["3", "Só no manual"]
    ]);
  });

  it("compares a month with the previous one for history purposes", () => {
    const previousRows = [
      { ID: "1", dataAbertura: "2026-02-01", assunto: "MAPEAMENTO", colaborador: "Felipe" }
    ];
    const currentRows = [
      { ID: "1", dataAbertura: "2026-02-01", assunto: "PODAS", colaborador: "Felipe" },
      { ID: "2", dataAbertura: "2026-03-03", assunto: "PODAS", colaborador: "Renan" }
    ];

    const result = compareMonthToPrevious(currentRows, previousRows);

    expect(result.summary).toEqual({
      totalAtual: 2,
      totalAnterior: 1,
      novo: 1,
      alterado: 1,
      semAlteracao: 0,
      totalIds: 2
    });
    expect(result.details[0]?.changed).toContain("Assunto");
    expect(result.details[1]?.status).toBe("Novo");
  });
});
