import path from "node:path";
import { Readable } from "node:stream";
import * as XLSX from "xlsx";
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

  it("suporta xlsx e xls e rejeita refMonth ou extensao invalidos", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        ID: "APR-200",
        "Data de abertura": "2026-04-01",
        Assunto: "PODAS",
        Colaborador: "Renan"
      }
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "APR");

    const xlsxRequest = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr-system.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
      }
    });
    const xlsxParsed = await parseAprImportRequest(xlsxRequest, "system");
    const xlsxResult = importAprRowsService(db, xlsxParsed);
    expect(xlsxResult.totalValid).toBe(1);

    const xlsRequest = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr-manual.xls",
        contentType: "application/vnd.ms-excel",
        content: XLSX.write(workbook, { type: "buffer", bookType: "xls" })
      }
    });
    const xlsParsed = await parseAprImportRequest(xlsRequest, "manual");
    const xlsResult = importAprRowsService(db, xlsParsed);
    expect(xlsResult.totalValid).toBe(1);

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

    const badExtRequest = createMultipartRequest({
      fields: { refMonth: "2026-04" },
      file: {
        name: "apr.txt",
        contentType: "text/plain",
        content: Buffer.from("invalid")
      }
    });
    await expect(parseAprImportRequest(badExtRequest, "manual")).rejects.toThrow(
      "Extensao invalida. Use csv, xlsx ou xls"
    );
  });
});
