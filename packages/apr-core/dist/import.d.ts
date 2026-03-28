import type { AprEntry, AprNormalizedRowsResult, AprSpreadsheetRow } from "./types.js";
export declare const csvMaybeBroken: (text: string) => boolean;
export declare const parseCsvText: (text: string) => AprSpreadsheetRow[];
export declare const mapSpreadsheetRow: (row: AprSpreadsheetRow) => AprEntry;
export declare const normalizeAndValidateRows: (rawRows: AprSpreadsheetRow[]) => AprNormalizedRowsResult;
export declare const groupRowsByDateMonth: (rows: AprEntry[], fallbackMonth?: string) => Map<string, AprEntry[]>;
export declare const monthImportSummary: (grouped: Map<string, AprEntry[]>) => string;
