import path from "node:path";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Request } from "express";
import { connectDatabase, runMigrations } from "../db";
import { parseAprImportRequest } from "../modules/apr/import";
import { importAprRowsService } from "../modules/apr/service";

const createMultipartRequest = (params: {
  fields: Record<string, string>;
  file: {
    name: string;
    contentType: string;
    content: Buffer;
  };
}): Request => {
  const boundary = "----NoctificationAprBoundary";
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(params.fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
        "utf-8"
      )
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${params.file.name}"\r\nContent-Type: ${params.file.contentType}\r\n\r\n`,
      "utf-8"
    )
  );
  chunks.push(params.file.content);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8"));

  const body = Buffer.concat(chunks);
  const stream = Readable.from(body) as Readable & Partial<Request>;
  stream.headers = {
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "content-length": String(body.length)
  };
  stream.method = "POST";
  stream.url = "/api/v1/apr/import/manual";
  return stream as Request;
};

const buildXlsxBuffer = async (
  rows: Array<{
    ID: string;
    "Data de abertura": string;
    Assunto: string;
    Colaborador: string;
  }>
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("APR");
  worksheet.columns = [
    { header: "ID", key: "ID" },
    { header: "Data de abertura", key: "Data de abertura" },
    { header: "Assunto", key: "Assunto" },
    { header: "Colaborador", key: "Colaborador" }
  ];
  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

describe("APR import integration", () => {
  let db: ReturnType<typeof connectDatabase>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
  });

  afterEach(() => {
    db.close();
  });

  it("integra parsing multipart csv com persistencia APR e valida invalidos/duplicados", async () => {
    const csv = [
      "ID;Data de abertura;Assunto;Colaborador",
      "APR-100;02/03/2026;Mapeamento;Joao Pedro",
      "APR-100;03/03/2026;Podas;Renan",
      ";03/03/2026;Podas;Renan"
    ].join("\n");

    const request = createMultipartRequest({
      fields: { refMonth: "2026-03" },
      file: {
        name: "apr-manual.csv",
        contentType: "text/csv",
        content: Buffer.from(csv, "utf-8")
      }
    });

    const parsed = await parseAprImportRequest(request, "manual");
    const result = importAprRowsService(db, parsed);

    expect(result).toMatchObject({
      monthRef: "2026-03",
      requestedMonthRef: "2026-03",
      importedMonths: ["2026-03"],
      monthDetectedByDate: false,
      sourceType: "manual",
      totalValid: 1,
      totalInvalid: 1,
      duplicates: ["APR-100"]
    });

    const counts = {
      entries: (db.prepare("SELECT COUNT(*) AS count FROM apr_entries WHERE source_type = 'manual'").get() as { count: number }).count,
      importRuns: (db.prepare("SELECT COUNT(*) AS count FROM apr_import_runs WHERE source_type = 'manual'").get() as { count: number }).count
    };

    expect(counts).toEqual({
      entries: 1,
      importRuns: 1
    });
  });

  it("suporta xlsx e rejeita refMonth ou extensao invalidos", async () => {
    const xlsxBuffer = await buildXlsxBuffer([
      {
        ID: "APR-200",
        "Data de abertura": "2026-04-01",
        Assunto: "PODAS",
        Colaborador: "Renan"
      }
    ]);

    const xlsxRequest = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr-system.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: xlsxBuffer
      }
    });
    const xlsxParsed = await parseAprImportRequest(xlsxRequest, "system");
    const xlsxResult = importAprRowsService(db, xlsxParsed);
    expect(xlsxResult.totalValid).toBe(1);

    const badMonthRequest = createMultipartRequest({
      fields: { refMonth: "04/2026" },
      file: {
        name: "apr.csv",
        contentType: "text/csv",
        content: Buffer.from("ID;Data de abertura;Assunto;Colaborador\n1;01/04/2026;PODAS;Renan")
      }
    });
    await expect(parseAprImportRequest(badMonthRequest, "manual")).rejects.toThrow(
      "refMonth invalido. Use o formato YYYY-MM"
    );

    const badRangeMonthRequest = createMultipartRequest({
      fields: { refMonth: "2026-19" },
      file: {
        name: "apr.csv",
        contentType: "text/csv",
        content: Buffer.from("ID;Data de abertura;Assunto;Colaborador\n1;01/04/2026;PODAS;Renan")
      }
    });
    await expect(parseAprImportRequest(badRangeMonthRequest, "manual")).rejects.toThrow(
      "refMonth invalido. Use o formato YYYY-MM"
    );

    const badExtRequest = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr.xls",
        contentType: "application/vnd.ms-excel",
        content: Buffer.from("invalid")
      }
    });
    await expect(parseAprImportRequest(badExtRequest, "manual")).rejects.toThrow(
      "Extensao invalida. Use csv ou xlsx"
    );
  });

  it("reconhece o mes real das APRs e persiste no month_ref correto", async () => {
    const csv = [
      "ID;Data de abertura;Assunto;Colaborador",
      '="235269";28/01/2026;MANUTENCAO FIBRA - INFRA;Felipe',
      '="235422";29/01/2026;DOCUMENTACAO FIBRA;Renan'
    ].join("\n");

    const request = createMultipartRequest({
      fields: { refMonth: "2026-03" },
      file: {
        name: "apr-system.csv",
        contentType: "text/csv",
        content: Buffer.from(csv, "utf-8")
      }
    });

    const parsed = await parseAprImportRequest(request, "system");
    const result = importAprRowsService(db, parsed);

    expect(result).toMatchObject({
      monthRef: "2026-01",
      requestedMonthRef: "2026-03",
      importedMonths: ["2026-01"],
      monthDetectedByDate: true,
      sourceType: "system",
      totalValid: 2
    });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM apr_entries e JOIN apr_reference_months m ON m.id=e.reference_month_id WHERE m.month_ref = '2026-01' AND e.source_type = 'system'"
      ).get()
    ).toMatchObject({ count: 2 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM apr_entries e JOIN apr_reference_months m ON m.id=e.reference_month_id WHERE m.month_ref = '2026-03' AND e.source_type = 'system'"
      ).get()
    ).toMatchObject({ count: 0 });
  });

  it("registra totais mensais sem repetir invalidos e duplicados globais em todos os meses", async () => {
    const csv = [
      "ID;Data de abertura;Assunto;Colaborador",
      "APR-301;15/03/2026;Mapeamento;Felipe",
      "APR-301;15/04/2026;Podas;Renan",
      "APR-304;18/03/2026;Vistoria;Joao",
      "APR-302;16/04/2026;Inspecao;Renan",
      "APR-303;17/03/2026;;Joao"
    ].join("\n");

    const request = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr-multi.csv",
        contentType: "text/csv",
        content: Buffer.from(csv, "utf-8")
      }
    });

    const parsed = await parseAprImportRequest(request, "manual");
    importAprRowsService(db, parsed);

    const importRuns = db
      .prepare(
        `
          SELECT
            m.month_ref AS monthRef,
            r.total_valid AS totalValid,
            r.total_invalid AS totalInvalid,
            r.duplicates AS duplicates,
            r.total_invalid_global AS totalInvalidGlobal,
            r.duplicates_global AS duplicatesGlobal
          FROM apr_import_runs r
          INNER JOIN apr_reference_months m ON m.id = r.reference_month_id
          ORDER BY m.month_ref ASC
        `
      )
      .all() as Array<{
      monthRef: string;
      totalValid: number;
      totalInvalid: number;
      duplicates: number;
      totalInvalidGlobal: number;
      duplicatesGlobal: number;
    }>;

    expect(importRuns).toEqual([
      {
        monthRef: "2026-03",
        totalValid: 1,
        totalInvalid: 1,
        duplicates: 1,
        totalInvalidGlobal: 1,
        duplicatesGlobal: 1
      },
      {
        monthRef: "2026-04",
        totalValid: 2,
        totalInvalid: 0,
        duplicates: 1,
        totalInvalidGlobal: 1,
        duplicatesGlobal: 1
      }
    ]);
  });
});
