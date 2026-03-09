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

const DEFAULT_JWT_SECRET = "change-this-secret";
const DEFAULT_ADMIN_PASSWORD = "ChangeMeNow123!";
const INSECURE_PRODUCTION_VALUES = new Set([
  DEFAULT_JWT_SECRET,
  "CHANGE_ME_TO_A_LONG_RANDOM_SECRET",
  DEFAULT_ADMIN_PASSWORD,
  "CHANGE_ME_ADMIN_PASSWORD"
]);

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
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresHours: toNumber(process.env.JWT_EXPIRES_HOURS, 8),
  corsOrigin,
  corsOrigins: parseCsv(corsOrigin, [defaultCorsOrigin]),
  cookieName: "nc_access",
  adminSeed: {
    login: process.env.ADMIN_LOGIN ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME ?? "Administrador"
  }
};

if (config.nodeEnv === "production") {
  if (INSECURE_PRODUCTION_VALUES.has(config.jwtSecret)) {
    throw new Error("JWT_SECRET inseguro para producao. Defina um segredo forte e unico.");
  }

  if (INSECURE_PRODUCTION_VALUES.has(config.adminSeed.password)) {
    throw new Error("ADMIN_PASSWORD inseguro para producao. Defina uma senha forte e unica.");
  }
}
