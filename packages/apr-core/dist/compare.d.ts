import type { AprAuditDetail, AprAuditSummary, AprEntry, AprHistoryDetail, AprHistorySummary } from "./types.js";
export declare const buildRowMap: (rows: AprEntry[]) => Map<string, AprEntry>;
export declare const compareBases: (systemRows: AprEntry[], manualRows: AprEntry[]) => {
    summary: AprAuditSummary;
    details: AprAuditDetail[];
};
export declare const compareMonthToPrevious: (currentRows: AprEntry[], previousRows: AprEntry[]) => {
    summary: AprHistorySummary;
    details: AprHistoryDetail[];
};
