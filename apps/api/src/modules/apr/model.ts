import { unwrapSpreadsheetFormulaText } from "@noctification/apr-core";
import type {
  AprEntryRecord,
  AprEntryRow,
  AprImportRunRow,
  AprMonthListRow,
  AprSourceType
} from "./repository";
import type { AprManualPayload } from "./validators";

export interface ParsedAprRow {
  id: number;
  monthRef: string;
  sourceType: AprSourceType;
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AprSnapshotPayloadRecord {
  scope: "all" | "month";
  monthRef: string | null;
  months: AprMonthListRow[];
  entries: AprEntryRow[];
  importRuns: AprImportRunRow[];
  collaborators: Array<{
    displayName: string;
    normalizedName: string;
    occurrenceCount: number;
  }>;
}

export const parseRawPayload = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const normalizeWhitespace = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ");

export const normalizeComparableText = (value: unknown): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const isAprRecognitionExceptionSubject = (value: unknown): boolean =>
  normalizeComparableText(value) === "check list de pops";

export const normalizeSubject = (value: string): string =>
  normalizeWhitespace(value).toLocaleUpperCase("pt-BR");

export const normalizeCollaborator = (value: string): string =>
  normalizeWhitespace(value).toLocaleUpperCase("pt-BR");

export const normalizeExternalId = (value: unknown): string =>
  normalizeWhitespace(unwrapSpreadsheetFormulaText(value));

export const monthFromIsoDate = (value: string): string => value.slice(0, 7);

export const getPreviousMonth = (monthRef: string): string => {
  const [year, month] = monthRef.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const normalizeEntryInput = (payload: AprManualPayload): AprEntryRecord => ({
  externalId: normalizeExternalId(payload.externalId),
  openedOn: payload.openedOn,
  subject: normalizeSubject(payload.subject),
  collaborator: normalizeCollaborator(payload.collaborator)
});

export const toParsedAprRow = (row: AprEntryRow): ParsedAprRow => ({
  id: row.id,
  monthRef: row.monthRef,
  sourceType: row.sourceType,
  externalId: normalizeExternalId(row.externalId),
  openedOn: row.openedOn,
  subject: row.subject,
  collaborator: normalizeCollaborator(row.collaborator),
  rawPayload: parseRawPayload(row.rawPayloadJson),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});
