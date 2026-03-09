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
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret",
  jwtExpiresHours: toNumber(process.env.JWT_EXPIRES_HOURS, 8),
  corsOrigin,
  corsOrigins: parseCsv(corsOrigin, [defaultCorsOrigin]),
  cookieName: "nc_access",
  adminSeed: {
    login: process.env.ADMIN_LOGIN ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "ChangeMeNow123!",
    name: process.env.ADMIN_NAME ?? "Administrador"
  }
};

