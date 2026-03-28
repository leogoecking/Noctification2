import { describe, expect, it } from "vitest";
import {
  groupRowsByDateMonth,
  mapSpreadsheetRow,
  monthImportSummary,
  normalizeAndValidateRows,
  parseCsvText
} from "./index";

describe("apr-core import", () => {
  it("parses csv text with quoted values", () => {
    const rows = parseCsvText('ID;Data de abertura;Assunto;Colaborador\n1;02/03/2026;"Mapeamento";"Joao Pedro"');

    expect(rows).toEqual([
      {
        ID: "1",
        "Data de abertura": "02/03/2026",
        Assunto: "Mapeamento",
        Colaborador: "Joao Pedro"
      }
    ]);
  });

  it("maps and validates spreadsheet rows", () => {
    const rawRows = [
      {
        ID: "1",
        "Data de abertura": "02/03/2026",
        Assunto: "Mapeamento",
        Colaborador: "Joao Pedro"
      },
      {
        ID: "1",
        "Data de abertura": "03/03/2026",
        Assunto: "Podas",
        Colaborador: "Renan"
      },
      {
        ID: "",
        "Data de abertura": "03/03/2026",
        Assunto: "Podas",
        Colaborador: "Renan"
      }
    ];

    expect(mapSpreadsheetRow(rawRows[0])).toEqual({
      ID: "1",
      dataAbertura: "2026-03-02",
      assunto: "MAPEAMENTO",
      colaborador: "JOÃO PEDRO DO CARMO ALMEIDA"
    });

    const normalized = normalizeAndValidateRows(rawRows);

    expect(normalized.rows).toEqual([
      {
        ID: "1",
        dataAbertura: "2026-03-03",
        assunto: "PODAS",
        colaborador: "RENAN MEDINA SCHULTZ"
      }
    ]);
    expect(normalized.duplicates).toEqual(["1"]);
    expect(normalized.invalid).toEqual(["Linha 4: ID ausente"]);
  });

  it("unwraps spreadsheet formula-text values before mapping", () => {
    expect(
      mapSpreadsheetRow({
        ID: '="235422"',
        "Data de abertura": '="2026-03-02"',
        Assunto: '="Mapeamento"',
        Colaborador: '="Joao Pedro"'
      })
    ).toEqual({
      ID: "235422",
      dataAbertura: "2026-03-02",
      assunto: "MAPEAMENTO",
      colaborador: "JOÃO PEDRO DO CARMO ALMEIDA"
    });
  });

  it("groups imported rows by month and summarizes them", () => {
    const grouped = groupRowsByDateMonth([
      { ID: "1", dataAbertura: "2026-03-02", assunto: "MAPEAMENTO", colaborador: "Felipe" },
      { ID: "2", dataAbertura: "2026-03-05", assunto: "PODAS", colaborador: "Renan" }
    ]);

    expect(grouped.get("2026-03")).toHaveLength(2);
    expect(monthImportSummary(grouped)).toBe("2026-03 (2)");
  });
});
