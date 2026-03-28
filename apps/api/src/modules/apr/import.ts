import fs from "node:fs/promises";
import { TextDecoder } from "node:util";
import ExcelJS from "exceljs";
import { IncomingForm, type Fields, type Files } from "formidable";
import {
  csvMaybeBroken,
  groupRowsByDateMonth,
  monthImportSummary,
  normalizeAndValidateRows,
  parseCsvText,
  type AprSpreadsheetRow
} from "@noctification/apr-core";
import type { Request } from "express";
import type { AprSourceType } from "./repository";
import { isValidAprMonthRef } from "./validators";

export interface ParsedAprUpload {
  fileName: string;
  refMonth: string;
  sourceType: AprSourceType;
  rows: ReturnType<typeof normalizeAndValidateRows>["rows"];
  invalid: string[];
  duplicates: string[];
  invalidByMonth: Map<string, number>;
  duplicatesByMonth: Map<string, Set<string>>;
  grouped: Map<string, ReturnType<typeof normalizeAndValidateRows>["rows"]>;
}

const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx"]);

const decodeCsvBuffer = (buffer: Buffer): string => {
  let text = new TextDecoder("utf-8").decode(buffer);
  if (csvMaybeBroken(text)) {
    try {
      text = new TextDecoder("windows-1252").decode(buffer);
    } catch {
      text = new TextDecoder("iso-8859-1").decode(buffer);
    }
  }
  return text;
};

const worksheetToRows = (worksheet: ExcelJS.Worksheet): AprSpreadsheetRow[] => {
  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: headerRow.cellCount }, (_, index) =>
    headerRow.getCell(index + 1).text.trim()
  );

  if (!headers.some((header) => header.length > 0)) {
    return [];
  }

  const rows: AprSpreadsheetRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      if (!header) {
        return accumulator;
      }

      accumulator[header] = row.getCell(index + 1).text.trim();
      return accumulator;
    }, {});

    if (Object.values(values).some((value) => value.length > 0)) {
      rows.push(values as AprSpreadsheetRow);
    }
  });

  return rows;
};

const parseSpreadsheetBuffer = async (buffer: Buffer, extension: string): Promise<AprSpreadsheetRow[]> => {
  if (extension === "csv") {
    return parseCsvText(decodeCsvBuffer(buffer));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]
  );
  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) {
    return [];
  }

  return worksheetToRows(firstSheet);
};

const getSingleFieldValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");

export const parseAprImportRequest = async (
  req: Request,
  sourceType: AprSourceType
): Promise<ParsedAprUpload> => {
  const form = new IncomingForm({
    multiples: false,
    allowEmptyFiles: false,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024
  });

  const { fields, files } = await new Promise<{
    fields: Fields;
    files: Files;
  }>((resolve, reject) => {
    form.parse(req, (error: Error | null, nextFields: Fields, nextFiles: Files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        fields: nextFields,
        files: nextFiles
      });
    });
  });

  const refMonth = getSingleFieldValue(fields.refMonth).trim();
  if (!isValidAprMonthRef(refMonth)) {
    throw new Error("refMonth invalido. Use o formato YYYY-MM");
  }

  const fileInput = files.file;
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
  if (!file) {
    throw new Error("file e obrigatorio");
  }

  const fileName = String(file.originalFilename ?? "").trim();
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Extensao invalida. Use csv ou xlsx");
  }

  const buffer = await fs.readFile(file.filepath);
  const rawRows = await parseSpreadsheetBuffer(buffer, extension);
  const normalized = normalizeAndValidateRows(rawRows);

  if (!normalized.rows.length) {
    throw new Error("Nenhum registro valido encontrado no arquivo");
  }

  const grouped = groupRowsByDateMonth(normalized.rows);
  if (!grouped.size) {
    throw new Error("Nao foi possivel processar os registros para o mes informado");
  }

  return {
    fileName,
    refMonth,
    sourceType,
    rows: normalized.rows,
    invalid: normalized.invalid,
    duplicates: normalized.duplicates,
    invalidByMonth: normalized.invalidByMonth,
    duplicatesByMonth: normalized.duplicatesByMonth,
    grouped
  };
};

export const buildAprImportResponseSummary = (grouped: Map<string, { length: number }[]>) =>
  monthImportSummary(grouped as never);
