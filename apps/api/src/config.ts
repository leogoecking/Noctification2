import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseCsv = (value: string, fallback: string[]): string[] => {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : fallback;
};

const DEV_JWT_FALLBACK = "change-this-secret";
const INSECURE_PRODUCTION_VALUES = new Set([
  DEV_JWT_FALLBACK,
  "CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
]);

export const FIXED_ADMIN_LOGIN = "admin";
export const FIXED_ADMIN_PASSWORD = "admin";
export const FIXED_ADMIN_NAME = "Administrador";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  dbPath: string;
  reminderTimezone: string;
  jwtSecret: string;
  jwtExpiresHours: number;
  corsOrigin: string;
  corsOrigins: string[];
  cookieName: string;
  cookieSecure: boolean;
  allowInsecureFixedAdmin: boolean;
  enableReminderScheduler: boolean;
  enableTaskAutomationScheduler?: boolean;
  enableAprModule?: boolean;
  taskAutomationDueSoonMinutes?: number;
  taskAutomationStaleHours?: number;
  webPushSubject?: string;
  webPushVapidPublicKey?: string;
  webPushVapidPrivateKey?: string;
  adminSeed: {
    login: string;
    password: string;
    name: string;
  };
}

const defaultCorsOrigin = "http://localhost:5173";
const configuredCorsOrigin = process.env.CORS_ORIGIN?.trim();
const corsOrigin = configuredCorsOrigin || defaultCorsOrigin;
const nodeEnv = process.env.NODE_ENV ?? "development";
const allowAnyDevOrigin =
  nodeEnv !== "production" &&
  (!configuredCorsOrigin || configuredCorsOrigin === defaultCorsOrigin);
const defaultAllowInsecureFixedAdmin = nodeEnv !== "production";
const allowInsecureFixedAdmin = toBoolean(
  process.env.ALLOW_INSECURE_FIXED_ADMIN,
  defaultAllowInsecureFixedAdmin
);

const configuredAdminLogin = process.env.ADMIN_LOGIN?.trim().toLowerCase();
const configuredAdminPassword = process.env.ADMIN_PASSWORD;
const configuredAdminName = process.env.ADMIN_NAME?.trim();
const adminSeed = {
  login: configuredAdminLogin || FIXED_ADMIN_LOGIN,
  password: configuredAdminPassword || FIXED_ADMIN_PASSWORD,
  name: configuredAdminName || FIXED_ADMIN_NAME
};

export const config: AppConfig = {
  nodeEnv,
  port: toNumber(process.env.PORT, 4000),
  dbPath: process.env.DB_PATH ?? "./data/noctification.db",
  reminderTimezone: "America/Bahia",
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_FALLBACK,
  jwtExpiresHours: toNumber(process.env.JWT_EXPIRES_HOURS, 8),
  corsOrigin,
  corsOrigins: allowAnyDevOrigin ? ["*"] : parseCsv(corsOrigin, [defaultCorsOrigin]),
  cookieName: "nc_access",
  cookieSecure: toBoolean(process.env.COOKIE_SECURE, nodeEnv === "production"),
  allowInsecureFixedAdmin,
  enableReminderScheduler: toBoolean(
    process.env.ENABLE_REMINDER_SCHEDULER,
    nodeEnv !== "production"
  ),
  enableTaskAutomationScheduler: toBoolean(process.env.ENABLE_TASK_AUTOMATION_SCHEDULER, false),
  enableAprModule: toBoolean(process.env.ENABLE_APR_MODULE, false),
  taskAutomationDueSoonMinutes: toNumber(
    process.env.TASK_AUTOMATION_DUE_SOON_MINUTES,
    120
  ),
  taskAutomationStaleHours: toNumber(process.env.TASK_AUTOMATION_STALE_HOURS, 24),
  webPushSubject: process.env.WEB_PUSH_SUBJECT?.trim(),
  webPushVapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim(),
  webPushVapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
  adminSeed
};

if (config.nodeEnv === "production") {
  if (INSECURE_PRODUCTION_VALUES.has(config.jwtSecret)) {
    throw new Error("JWT_SECRET inseguro para producao. Defina um segredo forte e unico.");
  }
}

const usingDefaultFixedAdmin =
  config.adminSeed.login === FIXED_ADMIN_LOGIN &&
  config.adminSeed.password === FIXED_ADMIN_PASSWORD &&
  config.adminSeed.name === FIXED_ADMIN_NAME;

if (usingDefaultFixedAdmin && !config.allowInsecureFixedAdmin) {
  throw new Error(
    "Admin fixo inseguro desabilitado. Defina ADMIN_LOGIN, ADMIN_PASSWORD e ADMIN_NAME ou habilite ALLOW_INSECURE_FIXED_ADMIN apenas em dev."
  );
}
