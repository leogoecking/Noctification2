import {
  monthFromIsoDate,
  normalizeDateValue,
  normalizeEmployeeName,
  normalizeHeader,
  normalizeSubjectPattern,
  unwrapSpreadsheetFormulaText,
  isValidIsoDate
} from "./normalize.js";
import type { AprEntry, AprNormalizedRowsResult, AprSpreadsheetRow } from "./types.js";

export const csvMaybeBroken = (text: string): boolean => /�/.test(text);

export const parseCsvText = (text: string): AprSpreadsheetRow[] => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const delimiter = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";

  const parseLine = (line: string): string[] => {
    const output: string[] = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        output.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    output.push(current);
    return output.map((value) => value.trim());
  };

  const headers = parseLine(lines[0]);
  const rows: AprSpreadsheetRow[] = [];

  for (let index = 1; index < lines.length; index++) {
    const values = parseLine(lines[index]);
    if (!values.length) {
      continue;
    }

    const row: AprSpreadsheetRow = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    rows.push(row);
  }

  return rows;
};

export const mapSpreadsheetRow = (row: AprSpreadsheetRow): AprEntry => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row || {})) {
    normalized[normalizeHeader(key)] =
      typeof value === "string" ? unwrapSpreadsheetFormulaText(value) : value;
  }

  return {
    ID: String(
      normalized["id"] ??
        normalized["codigo"] ??
        normalized["codigo apr"] ??
        normalized["apr"] ??
        ""
    ).trim(),
    dataAbertura: normalizeDateValue(
      normalized["data de abertura"] ??
        normalized["data abertura"] ??
        normalized["abertura"] ??
        normalized["data"] ??
        ""
    ),
    assunto: normalizeSubjectPattern(normalized["assunto"] ?? normalized["descricao"] ?? ""),
    colaborador: normalizeEmployeeName(
      normalized["colaborador"] ?? normalized["funcionario"] ?? normalized["responsavel"] ?? ""
    )
  };
};

export const normalizeAndValidateRows = (
  rawRows: AprSpreadsheetRow[]
): AprNormalizedRowsResult => {
  const rows: AprEntry[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const rowIndexById = new Map<string, number>();
  const monthById = new Map<string, string>();
  const invalidByMonth = new Map<string, number>();
  const duplicatesByMonth = new Map<string, Set<string>>();

  const addInvalidMonth = (month: string) => {
    if (!month) {
      return;
    }
    invalidByMonth.set(month, (invalidByMonth.get(month) || 0) + 1);
  };

  const addDuplicateMonth = (month: string, id: string) => {
    if (!month || !id) {
      return;
    }

    if (!duplicatesByMonth.has(month)) {
      duplicatesByMonth.set(month, new Set());
    }
    duplicatesByMonth.get(month)?.add(id);
  };

  rawRows.forEach((rawRow, index) => {
    const row = mapSpreadsheetRow(rawRow);
    const line = index + 2;
    const rowMonth = monthFromIsoDate(row.dataAbertura);

    if (!row.ID) {
      invalid.push(`Linha ${line}: ID ausente`);
      addInvalidMonth(rowMonth);
      return;
    }

    if (!isValidIsoDate(row.dataAbertura)) {
      invalid.push(`Linha ${line}: Data de abertura ausente/inválida`);
      addInvalidMonth(rowMonth);
      return;
    }

    if (!row.assunto) {
      invalid.push(`Linha ${line}: Assunto ausente`);
      addInvalidMonth(rowMonth);
      return;
    }

    if (!row.colaborador) {
      invalid.push(`Linha ${line}: Colaborador ausente`);
      addInvalidMonth(rowMonth);
      return;
    }

    if (rowIndexById.has(row.ID)) {
      duplicates.push(row.ID);
      addDuplicateMonth(rowMonth, row.ID);
      addDuplicateMonth(monthById.get(row.ID) || "", row.ID);
      rows[rowIndexById.get(row.ID) as number] = row;
      monthById.set(row.ID, rowMonth);
      return;
    }

    rowIndexById.set(row.ID, rows.length);
    monthById.set(row.ID, rowMonth);
    rows.push(row);
  });

  return {
    rows,
    invalid,
    duplicates: [...new Set(duplicates)],
    invalidByMonth,
    duplicatesByMonth
  };
};

export const groupRowsByDateMonth = (
  rows: AprEntry[],
  fallbackMonth?: string
): Map<string, AprEntry[]> => {
  const grouped = new Map<string, AprEntry[]>();

  for (const row of rows || []) {
    const month = fallbackMonth || monthFromIsoDate(row?.dataAbertura || "");
    if (!month) {
      continue;
    }

    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month)?.push(row);
  }

  return grouped;
};

export const monthImportSummary = (grouped: Map<string, AprEntry[]>): string =>
  [...grouped.entries()].map(([month, rows]) => `${month} (${rows.length})`).join(", ");
