export type AprSourceType = "manual" | "system";

export interface AprReferenceMonthRow {
  id: number;
  monthRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface AprMonthListRow extends AprReferenceMonthRow {
  manualCount: number;
  systemCount: number;
  lastManualImportAt: string | null;
  lastSystemImportAt: string | null;
}

export interface AprEntryRecord {
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayload?: Record<string, unknown>;
}

export interface AprEntryRow {
  id: number;
  referenceMonthId: number;
  monthRef: string;
  sourceType: AprSourceType;
  externalId: string;
  openedOn: string;
  subject: string;
  collaborator: string;
  rawPayloadJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AprImportRunParams {
  monthRef: string;
  sourceType: AprSourceType;
  fileName?: string;
  importedAt?: string;
  totalValid: number;
  totalInvalid?: number;
  duplicates?: number;
  totalInvalidGlobal?: number;
  duplicatesGlobal?: number;
  monthDetectedByDate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AprImportRunRow {
  id: number;
  referenceMonthId: number;
  sourceType: AprSourceType;
  fileName: string | null;
  importedAt: string;
  totalValid: number;
  totalInvalid: number;
  duplicates: number;
  totalInvalidGlobal: number;
  duplicatesGlobal: number;
  monthDetectedByDate: number;
  metadataJson: string | null;
}

export interface AprSnapshotParams {
  monthRef?: string;
  reason: string;
  payloadJson: string;
  checksum: string;
  createdAt?: string;
}

export interface AprSnapshotRow {
  id: number;
  referenceMonthId: number | null;
  snapshotReason: string;
  payloadJson: string;
  checksum: string;
  createdAt: string;
}

export interface AprCollaboratorRow {
  id: number;
  displayName: string;
  normalizedName: string;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AprSubjectCatalogRow {
  subject: string;
  occurrenceCount: number;
}
