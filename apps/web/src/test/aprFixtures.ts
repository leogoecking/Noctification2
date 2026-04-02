const baseRow = {
  id: 10,
  monthRef: "2026-03",
  sourceType: "manual" as const,
  externalId: "APR-001",
  openedOn: "2026-03-02",
  subject: "MAPEAMENTO",
  collaborator: "Felipe",
  rawPayload: null,
  createdAt: "2026-03-02T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z"
};

export const baseMonths = {
  months: [
    {
      id: 1,
      monthRef: "2026-03",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      manualCount: 1,
      systemCount: 1,
      lastManualImportAt: "2026-03-05T10:00:00.000Z",
      lastSystemImportAt: "2026-03-05T11:00:00.000Z"
    }
  ]
};

export const baseSummary = {
  monthRef: "2026-03",
  previousMonthRef: "2026-02",
  manualCount: 1,
  systemCount: 1,
  uniqueCollaborators: 1,
  statusGeral: "Conferido" as const,
  audit: {
    totalSistema: 1,
    totalManual: 1,
    conferido: 1,
    soSistema: 0,
    soManual: 0,
    totalIds: 1,
    divergentes: 0
  },
  history: {
    sourceType: "manual" as const,
    totalAtual: 1,
    totalAnterior: 1,
    novo: 0,
    alterado: 0,
    semAlteracao: 1,
    totalIds: 1
  }
};

export const baseRows = {
  monthRef: "2026-03",
  rows: [baseRow]
};

export const baseSubjects = {
  subjects: [
    { subject: "MAPEAMENTO", occurrenceCount: 3 },
    { subject: "PODAS", occurrenceCount: 2 }
  ]
};

export const baseCollaborators = {
  collaborators: [
    { displayName: "Felipe", occurrenceCount: 3 },
    { displayName: "Renan", occurrenceCount: 2 }
  ]
};

export const baseAudit = {
  monthRef: "2026-03",
  summary: {
    totalSistema: 1,
    totalManual: 1,
    conferido: 1,
    soSistema: 0,
    soManual: 0,
    totalIds: 1,
    statusGeral: "Conferido" as const,
    divergentes: 0
  },
  details: [
    {
      externalId: "APR-001",
      status: "Conferido" as const,
      changed: [],
      system: null,
      manual: null
    }
  ]
};

export const divergentAudit = {
  monthRef: "2026-03",
  summary: {
    totalSistema: 2,
    totalManual: 1,
    conferido: 0,
    soSistema: 1,
    soManual: 1,
    totalIds: 2,
    statusGeral: "Divergente" as const,
    divergentes: 2
  },
  details: [
    {
      externalId: "235269",
      status: "Só no sistema" as const,
      changed: [],
      system: {
        ...baseRow,
        sourceType: "system" as const,
        externalId: "235269",
        subject: "PODA",
        collaborator: "RENAN"
      },
      manual: null
    },
    {
      externalId: "235270",
      status: "Só no manual" as const,
      changed: ["Assunto"],
      system: null,
      manual: {
        ...baseRow,
        externalId: "235270",
        subject: "MAPEAMENTO",
        collaborator: "FELIPE"
      }
    }
  ]
};

export const baseHistory = {
  monthRef: "2026-03",
  previousMonthRef: "2026-02",
  sourceType: "manual" as const,
  summary: {
    totalAtual: 1,
    totalAnterior: 1,
    novo: 0,
    alterado: 0,
    semAlteracao: 1,
    totalIds: 1
  },
  details: [
    {
      externalId: "APR-001",
      status: "Sem alteração" as const,
      changed: [],
      current: null,
      previous: null
    }
  ]
};
