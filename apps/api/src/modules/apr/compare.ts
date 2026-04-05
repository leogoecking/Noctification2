import type { ParsedAprRow } from "./model";
import { isAprRecognitionExceptionSubject, normalizeComparableText } from "./model";

export interface AprAuditDetail {
  externalId: string;
  status: "Conferido" | "Só no sistema" | "Só no manual";
  changed: string[];
  system: ParsedAprRow | null;
  manual: ParsedAprRow | null;
}

export interface AprHistoryDetail {
  externalId: string;
  status: "Novo" | "Alterado" | "Sem alteração";
  changed: string[];
  current: ParsedAprRow | null;
  previous: ParsedAprRow | null;
}

const buildEntryMap = (rows: ParsedAprRow[]): Map<string, ParsedAprRow> => {
  const map = new Map<string, ParsedAprRow>();
  for (const row of rows) {
    map.set(row.externalId, row);
  }
  return map;
};

export const compareAprBases = (systemRows: ParsedAprRow[], manualRows: ParsedAprRow[]) => {
  const systemMap = buildEntryMap(systemRows);
  const manualMap = buildEntryMap(manualRows);
  const externalIds = [...new Set([...systemMap.keys(), ...manualMap.keys()])].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true })
  );

  const summary = {
    totalSistema: systemMap.size,
    totalManual: manualMap.size,
    conferido: 0,
    soSistema: 0,
    soManual: 0,
    totalIds: externalIds.length
  };
  const details: AprAuditDetail[] = [];

  for (const externalId of externalIds) {
    const system = systemMap.get(externalId) ?? null;
    const manual = manualMap.get(externalId) ?? null;
    const changed: string[] = [];
    let status: AprAuditDetail["status"];
    const shouldIgnoreAuditDivergence =
      isAprRecognitionExceptionSubject(system?.subject) ||
      isAprRecognitionExceptionSubject(manual?.subject);

    if (shouldIgnoreAuditDivergence) {
      status = "Conferido";
      summary.conferido++;
    } else if (system && manual) {
      status = "Conferido";
      summary.conferido++;

      if (system.openedOn !== manual.openedOn) {
        changed.push("Data de abertura");
      }
      if (normalizeComparableText(system.subject) !== normalizeComparableText(manual.subject)) {
        changed.push("Assunto");
      }
      if (
        normalizeComparableText(system.collaborator) !==
        normalizeComparableText(manual.collaborator)
      ) {
        changed.push("Colaborador");
      }
    } else if (system) {
      status = "Só no sistema";
      summary.soSistema++;
    } else {
      status = "Só no manual";
      summary.soManual++;
    }

    details.push({ externalId, status, changed, system, manual });
  }

  return { summary, details };
};

export const compareAprHistory = (currentRows: ParsedAprRow[], previousRows: ParsedAprRow[]) => {
  const currentMap = buildEntryMap(currentRows);
  const previousMap = buildEntryMap(previousRows);
  const externalIds = [...currentMap.keys()].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true })
  );

  const summary = {
    totalAtual: currentMap.size,
    totalAnterior: previousMap.size,
    novo: 0,
    alterado: 0,
    semAlteracao: 0,
    totalIds: externalIds.length
  };
  const details: AprHistoryDetail[] = [];

  for (const externalId of externalIds) {
    const current = currentMap.get(externalId) ?? null;
    const previous = previousMap.get(externalId) ?? null;
    const changed: string[] = [];
    let status: AprHistoryDetail["status"];
    const shouldIgnoreSubjectDifference =
      isAprRecognitionExceptionSubject(current?.subject) ||
      isAprRecognitionExceptionSubject(previous?.subject);

    if (!previous) {
      status = "Novo";
      summary.novo++;
    } else {
      if (current?.openedOn !== previous.openedOn) {
        changed.push("Data de abertura");
      }
      if (
        !shouldIgnoreSubjectDifference &&
        normalizeComparableText(current?.subject) !== normalizeComparableText(previous.subject)
      ) {
        changed.push("Assunto");
      }
      if (
        normalizeComparableText(current?.collaborator) !==
        normalizeComparableText(previous.collaborator)
      ) {
        changed.push("Colaborador");
      }

      if (changed.length > 0) {
        status = "Alterado";
        summary.alterado++;
      } else {
        status = "Sem alteração";
        summary.semAlteracao++;
      }
    }

    details.push({ externalId, status, changed, current, previous });
  }

  return { summary, details };
};
