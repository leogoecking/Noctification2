import type Database from "better-sqlite3";
import {
  clearAllAprData,
  clearAprMonthData,
  createAprSnapshot,
  listAprSnapshots,
  rebuildAprCollaboratorCatalog
} from "./repository";
import {
  buildSnapshotPayload,
  checksumPayload,
  findRestorableSnapshot,
  restoreSnapshotPayload
} from "./snapshots";
import type { AprDestructivePayload, AprSnapshotPayload } from "./validators";
import type { AprSnapshotPayloadRecord } from "./model";

const createAprSafeguardSnapshot = (
  db: Database.Database,
  params: { monthRef?: string; reason: string }
) => {
  const snapshotPayload = buildSnapshotPayload(db, params.monthRef);
  const payloadJson = JSON.stringify({
    ...snapshotPayload,
    requestedReason: params.reason
  });

  return createAprSnapshot(db, {
    monthRef: params.monthRef,
    reason: params.reason,
    payloadJson,
    checksum: checksumPayload(payloadJson)
  });
};

export const createAprSnapshotService = (
  db: Database.Database,
  params: { monthRef?: string; payload: AprSnapshotPayload }
) => {
  rebuildAprCollaboratorCatalog(db);
  const snapshotPayload = buildSnapshotPayload(db, params.monthRef);
  const payloadJson = JSON.stringify({
    ...snapshotPayload,
    requestedReason: params.payload.reason
  });
  const snapshotId = createAprSnapshot(db, {
    monthRef: params.monthRef,
    reason: params.payload.reason,
    payloadJson,
    checksum: checksumPayload(payloadJson)
  });

  return {
    snapshotId,
    scope: snapshotPayload.scope,
    monthRef: snapshotPayload.monthRef,
    reason: params.payload.reason
  };
};

export const listAprSnapshotsService = (db: Database.Database, params: { monthRef?: string }) => ({
  snapshots: listAprSnapshots(db, params.monthRef)
});

export const restoreLatestAprSnapshotService = (
  db: Database.Database,
  params: { monthRef?: string; payload: AprDestructivePayload }
) => {
  const latestSnapshot = findRestorableSnapshot(db, params.monthRef);
  if (!latestSnapshot) {
    return { error: "Nenhum snapshot APR disponivel para restauracao", status: 404 as const };
  }

  createAprSafeguardSnapshot(db, {
    monthRef: params.monthRef,
    reason: `pre-restore:${params.payload.reason}`
  });

  const parsedSnapshot = JSON.parse(latestSnapshot.payloadJson) as AprSnapshotPayloadRecord;
  const restored = restoreSnapshotPayload(db, parsedSnapshot);

  return {
    ok: true,
    restoredFromSnapshotId: latestSnapshot.id,
    scope: parsedSnapshot.scope,
    monthRef: parsedSnapshot.monthRef,
    ...restored
  };
};

export const clearAprMonthService = (
  db: Database.Database,
  params: { monthRef: string; payload: AprDestructivePayload }
) => {
  const snapshotId = createAprSafeguardSnapshot(db, {
    monthRef: params.monthRef,
    reason: `pre-clear-month:${params.payload.reason}`
  });
  const cleared = clearAprMonthData(db, params.monthRef);

  return {
    ok: true,
    monthRef: params.monthRef,
    safeguardSnapshotId: snapshotId,
    ...cleared
  };
};

export const clearAllAprService = (
  db: Database.Database,
  params: { payload: AprDestructivePayload }
) => {
  const snapshotId = createAprSafeguardSnapshot(db, {
    reason: `pre-clear-all:${params.payload.reason}`
  });
  const cleared = clearAllAprData(db);

  return {
    ok: true,
    safeguardSnapshotId: snapshotId,
    ...cleared
  };
};
