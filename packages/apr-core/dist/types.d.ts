export interface AprEntry {
    ID: string;
    dataAbertura: string;
    assunto: string;
    colaborador: string;
}
export interface AprImportMeta {
    fileName?: string;
    importedAt?: string;
    totalValid?: number;
    totalInvalid?: number;
    duplicates?: number;
    totalInvalidGlobal?: number;
    duplicatesGlobal?: number;
    monthDetectedByDate?: boolean;
}
export interface AprMonthPack {
    manual: AprEntry[];
    system: AprEntry[];
    imports: Record<string, AprImportMeta>;
}
export interface AprDb {
    months: Record<string, AprMonthPack>;
    meta: {
        createdAt: string;
        updatedAt: string;
    };
}
export interface AprSnapshotEnvelope {
    v: number;
    at: string;
    reason: string;
    data: string;
    checksum: string;
}
export interface AprAuditSummary {
    totalSistema: number;
    totalManual: number;
    conferido: number;
    soSistema: number;
    soManual: number;
    totalIds: number;
}
export interface AprAuditDetail {
    ID: string;
    status: "Conferido" | "Só no sistema" | "Só no manual";
    changed: string[];
    system: AprEntry | null;
    manual: AprEntry | null;
}
export interface AprHistorySummary {
    totalAtual: number;
    totalAnterior: number;
    novo: number;
    alterado: number;
    semAlteracao: number;
    totalIds: number;
}
export interface AprHistoryDetail {
    ID: string;
    status: "Novo" | "Alterado" | "Sem alteração";
    changed: string[];
    current: AprEntry | null;
    previous: AprEntry | null;
}
export interface AprNormalizedRowsResult {
    rows: AprEntry[];
    invalid: string[];
    duplicates: string[];
    invalidByMonth: Map<string, number>;
    duplicatesByMonth: Map<string, Set<string>>;
}
export type AprSpreadsheetRow = Record<string, unknown>;
