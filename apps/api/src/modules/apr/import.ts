import fs from "node:fs/promises";
import { TextDecoder } from "node:util";
import { IncomingForm, type Fields, type Files } from "formidable";
import * as XLSX from "xlsx";
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
  grouped: Map<string, ReturnType<typeof normalizeAndValidateRows>["rows"]>;
}

const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);

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

const parseSpreadsheetBuffer = (buffer: Buffer, extension: string): AprSpreadsheetRow[] => {
  if (extension === "csv") {
    return parseCsvText(decodeCsvBuffer(buffer));
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!firstSheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as AprSpreadsheetRow[];
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
    throw new Error("Extensao invalida. Use csv, xlsx ou xls");
  }

  const buffer = await fs.readFile(file.filepath);
  const rawRows = parseSpreadsheetBuffer(buffer, extension);
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
    grouped
  };
};

export const buildAprImportResponseSummary = (grouped: Map<string, { length: number }[]>) =>
  monthImportSummary(grouped as never);
