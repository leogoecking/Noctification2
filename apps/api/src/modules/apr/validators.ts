import { unwrapSpreadsheetFormulaText } from "@noctification/apr-core";
import type { AprSourceType } from "./repository";

export interface AprManualPayload {
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
}

export interface AprAuditFilters {
  mode: "all" | "missing";
  search: string | null;
  collaborator: string | null;
  subject: string | null;
  date: string | null;
}

export interface AprSnapshotPayload {
  reason: string;
}

export interface AprDestructivePayload {
  reason: string;
  confirmText: string;
}

const normalizeWhitespace = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ");
const normalizeExternalId = (value: unknown): string =>
  normalizeWhitespace(unwrapSpreadsheetFormulaText(value));

const readBodyRecord = (body: unknown): Record<string, unknown> => (body as Record<string, unknown> | null | undefined) ?? {};

export const isValidAprMonthRef = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}$/.test(value);

export const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const maxDay = new Date(year, month, 0).getDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= maxDay;
};

export const parseAprMonthParam = (value: unknown): string | null =>
  isValidAprMonthRef(value) ? value : null;

export const parseAprEntryIdParam = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseAprSourceType = (
  value: unknown,
  fallback?: AprSourceType
): AprSourceType | undefined | null => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === "manual" || value === "system") {
    return value;
  }

  return null;
};

export const parseAprAuditMode = (value: unknown): "all" | "missing" | null => {
  if (value === undefined || value === null || value === "") {
    return "all";
  }

  if (value === "all" || value === "missing") {
    return value;
  }

  return null;
};

export const parseAprHistorySource = (value: unknown): AprSourceType | null => {
  const parsed = parseAprSourceType(value, "manual");
  return parsed ?? null;
};

export const validateAprManualPayload = (
  body: unknown
): { value: AprManualPayload } | { error: string } => {
  const payload = body as Record<string, unknown> | null | undefined;
  const externalId = normalizeExternalId(payload?.external_id);
  const openedOn = normalizeWhitespace(payload?.opened_on);
  const subject = normalizeWhitespace(payload?.subject);
  const collaborator = normalizeWhitespace(payload?.collaborator);

  if (!externalId) {
    return { error: "external_id e obrigatorio" };
  }

  if (!isValidIsoDate(openedOn)) {
    return { error: "opened_on deve estar no formato YYYY-MM-DD" };
  }

  if (!subject) {
    return { error: "subject e obrigatorio" };
  }

  if (!collaborator) {
    return { error: "collaborator e obrigatorio" };
  }

  return {
    value: {
      externalId,
      openedOn,
      subject,
      collaborator
    }
  };
};

export const buildAprAuditFilters = (
  query: Record<string, unknown> | undefined
): { value: AprAuditFilters } | { error: string } => {
  const mode = parseAprAuditMode(query?.mode);
  if (!mode) {
    return { error: "mode deve ser all ou missing" };
  }

  const date = normalizeWhitespace(query?.date) || null;
  if (date && !isValidIsoDate(date)) {
    return { error: "date deve estar no formato YYYY-MM-DD" };
  }

  return {
    value: {
      mode,
      search: normalizeWhitespace(query?.search) || null,
      collaborator: normalizeWhitespace(query?.collaborator) || null,
      subject: normalizeWhitespace(query?.subject) || null,
      date
    }
  };
};

export const validateAprSnapshotPayload = (
  body: unknown
): { value: AprSnapshotPayload } | { error: string } => {
  const payload = readBodyRecord(body);
  const reason = normalizeWhitespace(payload.reason);

  if (!reason) {
    return { error: "reason e obrigatorio" };
  }

  return {
    value: {
      reason
    }
  };
};

const validateDestructivePayloadBase = (
  body: unknown
): { value: AprDestructivePayload } | { error: string } => {
  const payload = readBodyRecord(body);
  const reason = normalizeWhitespace(payload.reason);
  const confirmText = normalizeWhitespace(payload.confirm_text);

  if (!reason) {
    return { error: "reason e obrigatorio" };
  }

  if (!confirmText) {
    return { error: "confirm_text e obrigatorio" };
  }

  return {
    value: {
      reason,
      confirmText
    }
  };
};

export const validateAprRestorePayload = (
  body: unknown,
  expectedConfirmText: string
): { value: AprDestructivePayload } | { error: string } => {
  const parsed = validateDestructivePayloadBase(body);
  if ("error" in parsed) {
    return parsed;
  }

  if (parsed.value.confirmText !== expectedConfirmText) {
    return { error: `confirm_text deve ser exatamente ${expectedConfirmText}` };
  }

  return parsed;
};

export const validateAprClearPayload = validateAprRestorePayload;
