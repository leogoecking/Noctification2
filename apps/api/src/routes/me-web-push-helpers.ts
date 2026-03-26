import type Database from "better-sqlite3";
import { logAudit } from "../db";
import {
  isWebPushEnabled,
  removeWebPushSubscription,
  upsertWebPushSubscription,
  type WebPushSubscriptionInput
} from "../push/service";
import type { AppConfig } from "../config";

export const saveUserWebPushSubscription = (
  db: Database.Database,
  config: AppConfig,
  params: {
    userId: number;
    body: Record<string, unknown> | undefined;
    userAgent: string | null;
  }
): { ok: true } | { error: string; status: number } => {
  if (!isWebPushEnabled(config)) {
    return { error: "Web Push desabilitado", status: 503 };
  }

  const keys =
    params.body?.keys && typeof params.body.keys === "object"
      ? (params.body.keys as Record<string, unknown>)
      : {};
  const endpoint = typeof params.body?.endpoint === "string" ? params.body.endpoint.trim() : "";
  const expirationTime =
    typeof params.body?.expirationTime === "number" ? params.body.expirationTime : null;
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys.auth === "string" ? keys.auth.trim() : "";
  const deviceLabel =
    typeof params.body?.deviceLabel === "string" ? params.body.deviceLabel.trim() : null;

  if (!endpoint || !p256dh || !auth) {
    return { error: "Subscription invalida", status: 400 };
  }

  const subscription: WebPushSubscriptionInput = {
    endpoint,
    expirationTime,
    keys: {
      p256dh,
      auth
    }
  };

  upsertWebPushSubscription(db, params.userId, subscription, {
    userAgent: params.userAgent,
    deviceLabel
  });

  logAudit(db, {
    actorUserId: params.userId,
    eventType: "web_push.subscription.upsert",
    targetType: "web_push_subscription",
    metadata: {
      endpoint,
      hasExpirationTime: expirationTime !== null,
      deviceLabel
    }
  });

  return { ok: true };
};

export const deleteUserWebPushSubscription = (
  db: Database.Database,
  params: {
    userId: number;
    body: Record<string, unknown> | undefined;
  }
): { ok: true; removed: number } | { error: string; status: number } => {
  const endpoint = typeof params.body?.endpoint === "string" ? params.body.endpoint.trim() : "";
  if (!endpoint) {
    return { error: "endpoint obrigatorio", status: 400 };
  }

  const removed = removeWebPushSubscription(db, params.userId, endpoint);

  logAudit(db, {
    actorUserId: params.userId,
    eventType: "web_push.subscription.delete",
    targetType: "web_push_subscription",
    metadata: {
      endpoint,
      removed
    }
  });

  return { ok: true, removed };
};
