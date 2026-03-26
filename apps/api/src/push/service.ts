import type Database from "better-sqlite3";
import * as webpush from "web-push";
import { nowIso } from "../db";
import type { AppConfig } from "../config";

export interface WebPushSubscriptionInput {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface StoredSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  notificationId: number;
  kind: "notification";
}

let configuredSignature = "";

const getConfigSignature = (config: AppConfig): string =>
  [
    config.webPushSubject ?? "",
    config.webPushVapidPublicKey ?? "",
    config.webPushVapidPrivateKey ?? ""
  ].join("|");

export const isWebPushEnabled = (config: AppConfig): boolean =>
  Boolean(
    config.webPushSubject &&
      config.webPushVapidPublicKey &&
      config.webPushVapidPrivateKey
  );

const ensureWebPushConfigured = (config: AppConfig): void => {
  if (!isWebPushEnabled(config)) {
    return;
  }

  const nextSignature = getConfigSignature(config);
  if (configuredSignature === nextSignature) {
    return;
  }

  webpush.setVapidDetails(
    config.webPushSubject as string,
    config.webPushVapidPublicKey as string,
    config.webPushVapidPrivateKey as string
  );
  configuredSignature = nextSignature;
};

const toOptionalTrimmed = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getWebPushConfigResponse = (config: AppConfig) => ({
  enabled: isWebPushEnabled(config),
  vapidPublicKey: isWebPushEnabled(config) ? config.webPushVapidPublicKey ?? null : null
});

export const upsertWebPushSubscription = (
  db: Database.Database,
  userId: number,
  input: WebPushSubscriptionInput,
  metadata?: {
    userAgent?: string | null;
    deviceLabel?: string | null;
  }
): void => {
  const timestamp = nowIso();
  const expirationTime =
    typeof input.expirationTime === "number" && Number.isFinite(input.expirationTime)
      ? String(input.expirationTime)
      : null;

  db.prepare(
    `
      INSERT INTO web_push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth,
        expiration_time,
        user_agent,
        device_label,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        expiration_time = excluded.expiration_time,
        user_agent = excluded.user_agent,
        device_label = excluded.device_label,
        updated_at = excluded.updated_at
    `
  ).run(
    userId,
    input.endpoint,
    input.keys.p256dh,
    input.keys.auth,
    expirationTime,
    metadata?.userAgent ?? "",
    toOptionalTrimmed(metadata?.deviceLabel),
    timestamp,
    timestamp
  );
};

export const removeWebPushSubscription = (
  db: Database.Database,
  userId: number,
  endpoint: string
): number => {
  const result = db
    .prepare(
      `
        DELETE FROM web_push_subscriptions
        WHERE user_id = ?
          AND endpoint = ?
      `
    )
    .run(userId, endpoint);

  return result.changes;
};

const markSubscriptionSuccess = (
  db: Database.Database,
  userId: number,
  endpoint: string
): void => {
  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE web_push_subscriptions
      SET
        last_success_at = ?,
        last_failure_at = NULL,
        failure_reason = NULL,
        updated_at = ?
      WHERE user_id = ?
        AND endpoint = ?
    `
  ).run(timestamp, timestamp, userId, endpoint);
};

const markSubscriptionFailure = (
  db: Database.Database,
  userId: number,
  endpoint: string,
  reason: string
): void => {
  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE web_push_subscriptions
      SET
        last_failure_at = ?,
        failure_reason = ?,
        updated_at = ?
      WHERE user_id = ?
        AND endpoint = ?
    `
  ).run(timestamp, reason, timestamp, userId, endpoint);
};

const fetchSubscriptionsForUser = (
  db: Database.Database,
  userId: number
): StoredSubscriptionRow[] =>
  db
    .prepare(
      `
        SELECT endpoint, p256dh, auth
        FROM web_push_subscriptions
        WHERE user_id = ?
        ORDER BY id ASC
      `
    )
    .all(userId) as StoredSubscriptionRow[];

const isGoneSubscriptionError = (error: unknown): boolean => {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  ) {
    return true;
  }

  return false;
};

const toErrorReason = (error: unknown): string => {
  if (!error) {
    return "erro_desconhecido";
  }

  if (typeof error === "object" && "body" in error && typeof error.body === "string") {
    const body = error.body.trim();
    if (body.length > 0) {
      return body;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "erro_desconhecido";
};

export const sendWebPushNotificationToUser = async (
  db: Database.Database,
  config: AppConfig,
  userId: number,
  payload: WebPushNotificationPayload
): Promise<void> => {
  if (!isWebPushEnabled(config)) {
    return;
  }

  ensureWebPushConfigured(config);

  const subscriptions = fetchSubscriptionsForUser(db, userId);
  if (subscriptions.length === 0) {
    return;
  }

  const serializedPayload = JSON.stringify(payload);

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        serializedPayload,
        {
          TTL: 60,
          urgency: "high"
        }
      );

      markSubscriptionSuccess(db, userId, subscription.endpoint);
    } catch (error) {
      if (isGoneSubscriptionError(error)) {
        removeWebPushSubscription(db, userId, subscription.endpoint);
        continue;
      }

      markSubscriptionFailure(db, userId, subscription.endpoint, toErrorReason(error));
      console.error("[web-push] send failed", {
        userId,
        endpoint: subscription.endpoint,
        error
      });
    }
  }
};
