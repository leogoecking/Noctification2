import { describe, expect, it } from "vitest";
import {
  canonicalEmployeeMatch,
  cloneDb,
  formatDateBr,
  getPreviousMonth,
  integrityChecksum,
  normalizeDateValue,
  normalizeDbShape,
  normalizeEmployeeName,
  normalizeSnapshotEnvelope,
  normalizeSubjectPattern,
  parseDbString,
  snapshotFromRaw
} from "./index";

describe("apr-core normalization", () => {
  it("normalizes employee aliases to the canonical catalog", () => {
    expect(canonicalEmployeeMatch("joao pedro")).toBe("JOÃO PEDRO DO CARMO ALMEIDA");
    expect(normalizeEmployeeName("venicio leal")).toBe("VENICIO DOS SANTOS LEAL");
  });

  it("normalizes subject and dates from spreadsheet-friendly inputs", () => {
    expect(normalizeSubjectPattern("  mapeamento  ")).toBe("MAPEAMENTO");
    expect(normalizeDateValue("2/3/2026")).toBe("2026-03-02");
    expect(normalizeDateValue("2026-3-2T10:30:00")).toBe("2026-03-02");
    expect(normalizeDateValue(46000)).toBe("2025-12-09");
    expect(formatDateBr("2026-03-02")).toBe("02/03/2026");
  });

  it("normalizes db and snapshots without browser storage concerns", () => {
    const db = normalizeDbShape({
      months: {
        "2026-03": {
          manual: [{ ID: "1", dataAbertura: "2026-03-02", assunto: "MAPEAMENTO", colaborador: "Felipe" }]
        }
      }
    });

    const raw = JSON.stringify(db);
    const snapshot = snapshotFromRaw(raw, "teste", "2026-03-27T10:00:00.000Z");

    expect(parseDbString(raw)).toEqual(db);
    expect(cloneDb(db)).toEqual(db);
    expect(snapshot.checksum).toBe(
      integrityChecksum("2026-03-27T10:00:00.000Z", "teste", raw)
    );
    expect(normalizeSnapshotEnvelope(snapshot)).toEqual(snapshot);
    expect(getPreviousMonth("2026-03")).toBe("2026-02");
  });
});
