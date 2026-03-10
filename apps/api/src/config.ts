import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  jwtSecret: string;
  jwtExpiresHours: number;
  corsOrigin: string;
  corsOrigins: string[];
  cookieName: string;
  adminSeed: {
    login: string;
    password: string;
    name: string;
  };
}

const defaultCorsOrigin = "http://localhost:5173";
const corsOrigin = process.env.CORS_ORIGIN ?? defaultCorsOrigin;

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  dbPath: process.env.DB_PATH ?? "./data/noctification.db",
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_FALLBACK,
  jwtExpiresHours: toNumber(process.env.JWT_EXPIRES_HOURS, 8),
  corsOrigin,
  corsOrigins: parseCsv(corsOrigin, [defaultCorsOrigin]),
  cookieName: "nc_access",
  adminSeed: {
    login: FIXED_ADMIN_LOGIN,
    password: FIXED_ADMIN_PASSWORD,
    name: FIXED_ADMIN_NAME
  }
};

if (config.nodeEnv === "production") {
  if (INSECURE_PRODUCTION_VALUES.has(config.jwtSecret)) {
    throw new Error("JWT_SECRET inseguro para producao. Defina um segredo forte e unico.");
  }
}
