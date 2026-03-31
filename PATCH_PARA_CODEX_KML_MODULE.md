# Patch pronto para o Codex — módulo KML/KMZ de padronização de postes

Cole o texto abaixo no Codex dentro do repositório `Noctification2`.

## Instruções para o Codex

Aplique exatamente este patch no monorepo atual.

- Preserve a stack existente do repositório.

- Crie arquivos novos quando o caminho não existir.

- Nos arquivos marcados como `REPLACE`, substitua o conteúdo inteiro pelo conteúdo fornecido.

- Não altere outros arquivos fora dos listados.

- Depois de aplicar, rode `npm install`, `npm run typecheck`, `npm run test` e `npm run build`.

- Considere como obrigatórias as flags:

  - `apps/api/.env`: `ENABLE_KML_POSTE_MODULE=true`

  - `apps/web/.env`: `VITE_ENABLE_KML_POSTE_MODULE=true`


## Arquivos a aplicar


### REPLACE `package.json`

```json
{
  "name": "noctification2",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "apps/api",
    "apps/web",
    "packages/apr-core",
    "packages/poste-kml-core"
  ],
  "scripts": {
    "setup": "node scripts/setup.cjs",
    "prepare:deploy": "node scripts/prepare-deploy.cjs",
    "prepare:local-lan": "node scripts/prepare-local-lan.cjs",
    "check:deploy": "node scripts/check-deploy.cjs",
    "dev": "node scripts/dev.cjs",
    "dev:api": "npm run dev --workspace @noctification/api",
    "dev:web": "npm run dev --workspace @noctification/web",
    "build:core": "npm run build --workspace @noctification/apr-core && npm run build --workspace @noctification/poste-kml-core",
    "build:api": "npm run build --workspace @noctification/api",
    "build:web": "npm run build --workspace @noctification/web",
    "build": "npm run build --workspace @noctification/api && npm run build --workspace @noctification/web",
    "test:core": "npm run test --workspace @noctification/apr-core && npm run test --workspace @noctification/poste-kml-core",
    "test": "npm run test:api && npm run test:web",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test:api": "npm run test --workspace=apps/api",
    "test:web": "npm run test --workspace=apps/web",
    "check:core": "npm run typecheck --workspace @noctification/apr-core && npm run typecheck --workspace @noctification/poste-kml-core && npm run test --workspace @noctification/apr-core && npm run test --workspace @noctification/poste-kml-core",
    "check:api": "npm run lint --workspace @noctification/api && npm run typecheck --workspace @noctification/api && npm run test --workspace @noctification/api",
    "check:web": "npm run lint --workspace @noctification/web && npm run typecheck --workspace @noctification/web && npm run test --workspace @noctification/web",
    "check:fast": "npm run lint && npm run typecheck && npm run test:core",
    "validate:debian": "bash ops/scripts/validate-debian-login.sh",
    "deploy:debian": "bash ops/scripts/deploy-debian.sh"
  },
  "devDependencies": {
    "eslint": "^8.57.1",
    "@typescript-eslint/parser": "^8.32.1",
    "@typescript-eslint/eslint-plugin": "^8.32.1",
    "eslint-plugin-react-hooks": "^5.2.0"
  },
  "overrides": {
    "path-to-regexp": "0.1.13"
  }
}

```


### REPLACE `apps/api/package.json`

```json
{
  "name": "@noctification/api",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev": "node --watch --import tsx src/index.ts",
    "build": "npm run build --workspace @noctification/apr-core && npm run build --workspace @noctification/poste-kml-core && tsc -p tsconfig.build.json",
    "start": "node dist/index.js",
    "migrate": "node --import tsx src/scripts/migrate.ts",
    "generate-vapid": "web-push generate-vapid-keys",
    "bootstrap-admin": "node --import tsx src/scripts/bootstrap-admin.ts",
    "audit-logins": "node --import tsx src/scripts/audit-logins.ts",
    "test": "npm run build --workspace @noctification/apr-core && npm run build --workspace @noctification/poste-kml-core && vitest run --pool=threads",
    "lint": "eslint .",
    "typecheck": "npm run build --workspace @noctification/apr-core && npm run build --workspace @noctification/poste-kml-core && tsc --noEmit"
  },
  "dependencies": {
    "@noctification/apr-core": "file:../../packages/apr-core",
    "@noctification/poste-kml-core": "file:../../packages/poste-kml-core",
    "adm-zip": "^0.5.16",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.8.1",
    "cookie": "^1.1.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "exceljs": "^4.4.0",
    "express": "^4.21.2",
    "formidable": "^3.5.4",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.8.1",
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.7",
    "@types/bcryptjs": "^2.4.6",
    "@types/better-sqlite3": "^7.6.11",
    "@types/cookie": "^0.6.0",
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.18",
    "@types/express": "^4.17.21",
    "@types/formidable": "^3.5.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^22.13.10",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.1",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2",
    "vitest": "^3.0.8"
  }
}

```


### REPLACE `apps/api/src/app.ts`

```ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "./config";
import { createAuthRouter } from "./routes/auth";
import { createAdminRouter } from "./routes/admin";
import { createMeRouter } from "./routes/me";
import { createReminderAdminRouter } from "./routes/reminders-admin";
import { createReminderMeRouter } from "./routes/reminders-me";
import { createAprRouter } from "./modules/apr/route";
import { createTaskAdminRouterWithIo, createTaskMeRouterWithIo } from "./modules/tasks";
import { createKmlPosteRouter } from "./modules/kml-postes/routes";

const isCorsOriginAllowed = (allowedOrigins: Set<string>, origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has("*")) {
    return true;
  }

  return allowedOrigins.has(origin);
};

export const createApp = (db: Database.Database, io: Server, config: AppConfig) => {
  const app = express();
  const allowedOrigins = new Set(config.corsOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, isCorsOriginAllowed(allowedOrigins, origin));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      schedulers: {
        remindersEnabled: Boolean(config.enableReminderScheduler),
        taskAutomationEnabled: Boolean(config.enableTaskAutomationScheduler)
      },
      taskAutomation: {
        dueSoonWindowMinutes: config.taskAutomationDueSoonMinutes ?? 120,
        staleWindowHours: config.taskAutomationStaleHours ?? 24
      }
    });
  });

  app.use("/api/v1/auth", createAuthRouter(db, config));
  app.use("/api/v1/admin", createAdminRouter(db, io, config));
  app.use("/api/v1/admin", createReminderAdminRouter(db, io, config));
  app.use("/api/v1/admin", createTaskAdminRouterWithIo(db, io, config));
  app.use("/api/v1/me", createMeRouter(db, io, config));
  app.use("/api/v1/me", createReminderMeRouter(db, io, config));
  app.use("/api/v1/me", createTaskMeRouterWithIo(db, io, config));

  if (config.enableAprModule) {
    app.use("/api/v1/apr", createAprRouter(db, config));
  }

  if (config.enableKmlPosteModule) {
    app.use("/api/v1/kml-postes", createKmlPosteRouter(db, config));
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota nao encontrada" });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
};

```


### REPLACE `apps/api/src/config.ts`

```ts
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
  enableKmlPosteModule?: boolean;
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
  enableKmlPosteModule: toBoolean(process.env.ENABLE_KML_POSTE_MODULE, false),
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

```


### CREATE `apps/api/src/modules/kml-postes/routes.ts`

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { Router } from "express";
import formidable, { type Fields, type Files, type File } from "formidable";
import type Database from "better-sqlite3";
import AdmZip from "adm-zip";
import { standardizePosteKml, type DetectionMode } from "@noctification/poste-kml-core";
import type { AppConfig } from "../../config";
import { authenticate, requireRole } from "../../middleware/auth";

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

const readFieldValue = (fields: Fields, key: string): string => {
  const raw = fields[key];
  if (Array.isArray(raw)) {
    return String(raw[0] ?? "").trim();
  }

  return String(raw ?? "").trim();
};

const getSingleFile = (files: Files, key: string): File | null => {
  const raw = files[key];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }

  return raw ?? null;
};

const parseMultipart = async (
  req: import("express").Request
): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_UPLOAD_SIZE
  });

  return await new Promise((resolve, reject) => {
    form.parse(req as never, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
};

const stripKnownExtension = (fileName: string): string =>
  fileName.replace(/(\.kmz)?\.kml$/i, "").replace(/\.kmz$/i, "");

const toCsvCell = (value: string): string => {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
};

const buildMappingCsv = (
  mappings: Array<{
    sequence: number;
    oldName: string;
    newName: string;
    folderPath: string[];
    reason: string;
  }>
): string => {
  const header = ["sequence", "old_name", "new_name", "folder_path", "reason"];
  const lines = mappings.map((item) =>
    [
      String(item.sequence),
      toCsvCell(item.oldName),
      toCsvCell(item.newName),
      toCsvCell(item.folderPath.join(" / ")),
      toCsvCell(item.reason)
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
};

const buildKmzBuffer = (entryName: string, xml: string, originalBuffer?: Buffer): Buffer => {
  if (!originalBuffer) {
    const zip = new AdmZip();
    zip.addFile(entryName, Buffer.from(xml, "utf-8"));
    return zip.toBuffer();
  }

  const sourceZip = new AdmZip(originalBuffer);
  const outputZip = new AdmZip();
  const entries = sourceZip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) {
      outputZip.addFile(entry.entryName, Buffer.alloc(0));
      continue;
    }

    const data = entry.entryName === entryName ? Buffer.from(xml, "utf-8") : entry.getData();
    outputZip.addFile(entry.entryName, data);
  }

  return outputZip.toBuffer();
};

export const createKmlPosteRouter = (db: Database.Database, config: AppConfig) => {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      module: "kml-postes"
    });
  });

  router.use(authenticate(db, config));
  router.use(requireRole("admin"));

  router.post("/standardize", async (req, res) => {
    try {
      const { fields, files } = await parseMultipart(req);
      const upload = getSingleFile(files, "file");

      if (!upload) {
        res.status(400).json({ error: "Arquivo obrigatorio" });
        return;
      }

      const prefix = readFieldValue(fields, "prefix");
      if (!prefix) {
        res.status(400).json({ error: "prefix obrigatorio" });
        return;
      }

      const modeValue = readFieldValue(fields, "mode");
      const mode: DetectionMode =
        modeValue === "all-points" || modeValue === "folder-postes" ? modeValue : "auto";

      const startAtRaw = Number(readFieldValue(fields, "startAt") || "1");
      const startAt = Number.isFinite(startAtRaw) && startAtRaw > 0 ? Math.floor(startAtRaw) : 1;
      const ignoreNames = readFieldValue(fields, "ignoreNames")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      const inputBuffer = await fs.readFile(upload.filepath);
      const originalName = upload.originalFilename ?? "arquivo.kml";
      const extension = path.extname(originalName).toLowerCase();

      let sourceXml = "";
      let kmzEntryName = "doc.kml";
      let kmzSourceBuffer: Buffer | undefined;

      if (extension === ".kmz") {
        kmzSourceBuffer = inputBuffer;
        const zip = new AdmZip(inputBuffer);
        const targetEntry =
          zip
            .getEntries()
            .find((entry) => !entry.isDirectory && /(^|\/)doc\.kml$/i.test(entry.entryName)) ??
          zip
            .getEntries()
            .find((entry) => !entry.isDirectory && /\.kml$/i.test(entry.entryName));

        if (!targetEntry) {
          res.status(400).json({ error: "KMZ sem arquivo KML interno" });
          return;
        }

        kmzEntryName = targetEntry.entryName;
        sourceXml = targetEntry.getData().toString("utf-8");
      } else {
        sourceXml = inputBuffer.toString("utf-8");
      }

      const result = standardizePosteKml(sourceXml, {
        prefix,
        startAt,
        ignoreNames,
        mode
      });

      const baseName = stripKnownExtension(originalName);
      const kmlFileName = `${baseName} - PADRONIZADO.kml`;
      const kmzFileName = `${baseName} - PADRONIZADO.kmz`;
      const csvFileName = `${baseName} - MAPEAMENTO.csv`;
      const csvContent = buildMappingCsv(result.mappings);
      const kmlBuffer = Buffer.from(result.xml, "utf-8");
      const kmzBuffer = buildKmzBuffer(kmzEntryName, result.xml, kmzSourceBuffer);

      res.json({
        summary: result.summary,
        mappings: result.mappings,
        ignoredNames: result.ignoredNames,
        skippedNames: result.skippedNames,
        outputs: {
          kmlFileName,
          kmlBase64: kmlBuffer.toString("base64"),
          kmzFileName,
          kmzBase64: kmzBuffer.toString("base64"),
          csvFileName,
          csvBase64: Buffer.from(csvContent, "utf-8").toString("base64")
        }
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Falha ao padronizar arquivo KML/KMZ" });
    }
  });

  return router;
};

```


### REPLACE `apps/web/src/App.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { AprPage } from "./features/apr/AprPage";
import { KmlPostePage } from "./features/kml-postes/KmlPostePage";
import { useNotificationSocket } from "./hooks/useNotificationSocket";
import { useWebPushSubscription } from "./hooks/useWebPushSubscription";
import { primeReminderAudio } from "./lib/reminderAudio";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "./lib/featureFlags";
import type { AuthUser } from "./types";
import {
  AppHeader,
  AppToastStack,
  getPageTitle,
  normalizePath,
  UserWorkspace,
  type AppPath
} from "./components/app/appShell";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export default function App() {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPath, setCurrentPath] = useState<AppPath>(normalizePath(window.location.pathname));

  const navigate = useCallback((path: AppPath, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }

    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await api.me();
      setCurrentUser(response.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    primeReminderAudio();
  }, []);

  useEffect(() => {
    if (loadingSession) {
      return;
    }

    if (!currentUser) {
      if (currentPath !== "/login" && currentPath !== "/admin/login") {
        navigate("/login", true);
      }
      return;
    }

    if (currentUser.role === "admin") {
      const allowedPaths = new Set<AppPath>(["/"]);
      if (aprModuleEnabled) {
        allowedPaths.add("/apr");
      }
      if (kmlPosteModuleEnabled) {
        allowedPaths.add("/kml-postes");
      }

      if (!allowedPaths.has(currentPath)) {
        navigate("/", true);
      }
      return;
    }

    if (currentUser.role === "user" && currentPath === "/admin/login") {
      navigate("/", true);
    }
  }, [
    aprModuleEnabled,
    currentPath,
    currentUser,
    kmlPosteModuleEnabled,
    loadingSession,
    navigate
  ]);

  const login = useCallback(
    async (loginValue: string, password: string, expectedRole: AuthUser["role"]) => {
      setSubmittingAuth(true);

      try {
        const response = await api.login(loginValue, password, expectedRole);
        const user = response.user;

        if (user.role !== expectedRole) {
          try {
            await api.logout();
          } catch {
            // Best-effort cleanup for older API behavior that accepted the session.
          }

          setCurrentUser(null);
          throw new ApiError(
            expectedRole === "admin"
              ? "Use /login para acesso de usuario"
              : "Use /admin/login para acesso administrativo",
            403
          );
        }

        setCurrentUser(user);
        navigate("/", true);
        pushToast("Login realizado com sucesso", "ok");
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Falha no login";
        pushToast(message, "error");
      } finally {
        setSubmittingAuth(false);
      }
    },
    [navigate, pushToast]
  );

  const register = useCallback(
    async (name: string, loginValue: string, password: string) => {
      setSubmittingAuth(true);

      try {
        const response = await api.register(name, loginValue, password);
        setCurrentUser(response.user);
        navigate("/", true);
        pushToast("Conta criada com sucesso", "ok");
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Falha ao criar conta";
        pushToast(message, "error");
      } finally {
        setSubmittingAuth(false);
      }
    },
    [navigate, pushToast]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      navigate("/login", true);
      pushToast("Sessao encerrada", "ok");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao sair";
      pushToast(message, "error");
    }
  }, [navigate, pushToast]);

  const handleErrorToast = useCallback(
    (message: string) => {
      pushToast(message, "error");
    },
    [pushToast]
  );

  const handleOkToast = useCallback(
    (message: string) => {
      pushToast(message, "ok");
    },
    [pushToast]
  );

  const pageTitle = useMemo(() => getPageTitle(currentPath, currentUser), [currentPath, currentUser]);

  useNotificationSocket({
    enabled: currentUser?.role === "user",
    onError: handleErrorToast
  });

  useWebPushSubscription({
    enabled: currentUser?.role === "user",
    onError: handleErrorToast
  });

  return (
    <main className="min-h-screen bg-canvas text-textMain">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <AppHeader
          currentPath={currentPath}
          currentUser={currentUser}
          pageTitle={pageTitle}
          onLogout={() => void logout()}
          onNavigate={navigate}
        />

        {loadingSession && <p className="text-sm text-textMuted">Carregando sessao...</p>}

        {!loadingSession && !currentUser && currentPath === "/login" && (
          <LoginScreen
            mode="user"
            onLogin={(loginValue, password) => login(loginValue, password, "user")}
            onRegister={register}
            isLoading={submittingAuth}
          />
        )}

        {!loadingSession && !currentUser && currentPath === "/admin/login" && (
          <LoginScreen
            mode="admin"
            onLogin={(loginValue, password) => login(loginValue, password, "admin")}
            isLoading={submittingAuth}
          />
        )}

        {!loadingSession && currentUser?.role === "user" && (
          <UserWorkspace
            currentPath={currentPath}
            currentUser={currentUser}
            onNavigate={navigate}
            onError={handleErrorToast}
            onToast={handleOkToast}
          />
        )}

        {!loadingSession && currentUser?.role === "admin" &&
          (currentPath === "/apr" && aprModuleEnabled ? (
            <AprPage onError={handleErrorToast} onToast={handleOkToast} />
          ) : currentPath === "/kml-postes" && kmlPosteModuleEnabled ? (
            <KmlPostePage onError={handleErrorToast} onToast={handleOkToast} />
          ) : (
            <AdminDashboard onError={handleErrorToast} onToast={handleOkToast} />
          ))}

      </div>

      <AppToastStack toasts={toasts} />
    </main>
  );
}

```


### REPLACE `apps/web/src/components/app/appShell.tsx`

```tsx
import { NotificationAlertCenter } from "../NotificationAlertCenter";
import { ReminderAlertCenter } from "../ReminderAlertCenter";
import { ReminderUserPanel } from "../ReminderUserPanel";
import { UserDashboard } from "../UserDashboard";
import { AprPage } from "../../features/apr/AprPage";
import { TaskUserPanel } from "../../features/tasks";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../../lib/featureFlags";
import type { AuthUser } from "../../types";

export type AppPath =
  | "/"
  | "/login"
  | "/admin/login"
  | "/notifications"
  | "/reminders"
  | "/tasks"
  | "/apr"
  | "/kml-postes";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export const normalizePath = (rawPath: string): AppPath => {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();

  if (rawPath === "/login") {
    return "/login";
  }

  if (rawPath === "/admin/login") {
    return "/admin/login";
  }

  if (rawPath === "/notifications") {
    return "/notifications";
  }

  if (rawPath === "/reminders") {
    return "/reminders";
  }

  if (rawPath === "/tasks") {
    return "/tasks";
  }

  if (rawPath === "/apr" && aprModuleEnabled) {
    return "/apr";
  }

  if (rawPath === "/kml-postes" && kmlPosteModuleEnabled) {
    return "/kml-postes";
  }

  return "/";
};

export const getPageTitle = (
  currentPath: AppPath,
  currentUser: AuthUser | null
): string => {
  if (!currentUser) {
    return currentPath === "/admin/login" ? "Console Administrativo" : "Acesso de Usuario";
  }

  if (currentUser.role === "admin") {
    if (currentPath === "/apr") {
      return "APR";
    }

    if (currentPath === "/kml-postes") {
      return "Padronizador KML/KMZ";
    }

    return "Console Administrativo";
  }

  if (currentPath === "/notifications") {
    return "Todas as Notificacoes";
  }

  if (currentPath === "/reminders") {
    return "Lembretes";
  }

  if (currentPath === "/tasks") {
    return "Tarefas";
  }

  if (currentPath === "/apr") {
    return "APR";
  }

  return "Painel Operacional";
};

interface AppHeaderProps {
  currentPath: AppPath;
  currentUser: AuthUser | null;
  pageTitle: string;
  onLogout: () => void;
  onNavigate: (path: AppPath) => void;
}

export const AppHeader = ({
  currentPath,
  currentUser,
  pageTitle,
  onLogout,
  onNavigate
}: AppHeaderProps) => {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Plataforma interna</p>
        <h1 className="font-display text-2xl text-textMain">{pageTitle}</h1>
      </div>

      {!currentUser && (
        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/login"
                ? "bg-accent text-slate-900"
                : "border border-slate-600 text-textMuted"
            }`}
            onClick={() => onNavigate("/login")}
          >
            /login
          </button>
          <button
            className={`rounded-xl px-3 py-2 text-sm ${
              currentPath === "/admin/login"
                ? "bg-accent text-slate-900"
                : "border border-slate-600 text-textMuted"
            }`}
            onClick={() => onNavigate("/admin/login")}
          >
            /admin/login
          </button>
        </div>
      )}

      {currentUser && (
        <div className="flex items-center gap-3">
          {currentUser.role === "admin" && (
            <>
              <button
                className={`rounded-xl px-3 py-2 text-sm ${
                  currentPath === "/"
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMuted"
                }`}
                onClick={() => onNavigate("/")}
                type="button"
              >
                Console
              </button>

              {aprModuleEnabled && (
                <button
                  className={`rounded-xl px-3 py-2 text-sm ${
                    currentPath === "/apr"
                      ? "bg-accent text-slate-900"
                      : "border border-slate-600 text-textMuted"
                  }`}
                  onClick={() => onNavigate("/apr")}
                  type="button"
                >
                  APR
                </button>
              )}

              {kmlPosteModuleEnabled && (
                <button
                  className={`rounded-xl px-3 py-2 text-sm ${
                    currentPath === "/kml-postes"
                      ? "bg-accent text-slate-900"
                      : "border border-slate-600 text-textMuted"
                  }`}
                  onClick={() => onNavigate("/kml-postes")}
                  type="button"
                >
                  KML/KMZ
                </button>
              )}
            </>
          )}
          <span className="rounded-xl border border-slate-700 bg-panel px-3 py-2 text-sm text-textMuted">
            {currentUser.name} ({currentUser.role})
          </span>
          <button
            className="rounded-xl bg-danger px-3 py-2 text-sm font-semibold text-white"
            onClick={onLogout}
          >
            Sair
          </button>
        </div>
      )}
    </header>
  );
};

interface UserWorkspaceProps {
  currentPath: AppPath;
  currentUser: AuthUser;
  onNavigate: (path: AppPath) => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const USER_NAV_ITEMS: Array<{ label: string; path: AppPath }> = [
  { label: "Painel", path: "/" },
  { label: "Notificacoes", path: "/notifications" },
  { label: "Tarefas", path: "/tasks" },
  { label: "Lembretes", path: "/reminders" }
];

export const UserWorkspace = ({
  currentPath,
  currentUser,
  onNavigate,
  onError,
  onToast
}: UserWorkspaceProps) => {
  const aprModuleEnabled = isAprModuleEnabled();

  return (
    <>
      <nav className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-panel p-2">
        {[...USER_NAV_ITEMS, ...(aprModuleEnabled ? [{ label: "APR", path: "/apr" as AppPath }] : [])].map((item) => (
          <button
            key={item.path}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              currentPath === item.path
                ? "bg-accent text-slate-900"
                : "text-textMuted hover:bg-panelAlt hover:text-textMain"
            }`}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <NotificationAlertCenter
        isVisible
        onError={onError}
        onToast={onToast}
        onOpenNotifications={() => onNavigate("/notifications")}
      />

      <ReminderAlertCenter
        isVisible
        onError={onError}
        onToast={onToast}
        onOpenReminders={() => onNavigate("/reminders")}
      />

      {currentPath === "/tasks" ? (
        <TaskUserPanel user={currentUser} onError={onError} onToast={onToast} />
      ) : currentPath === "/apr" ? (
        <AprPage onError={onError} onToast={onToast} />
      ) : currentPath === "/reminders" ? (
        <ReminderUserPanel onError={onError} onToast={onToast} />
      ) : (
        <UserDashboard
          user={currentUser}
          isNotificationsPage={currentPath === "/notifications"}
          onOpenAllNotifications={() => onNavigate("/notifications")}
          onBackToDashboard={() => onNavigate("/")}
          onError={onError}
          onToast={onToast}
        />
      )}
    </>
  );
};

interface AppToastStackProps {
  toasts: Toast[];
}

export const AppToastStack = ({ toasts }: AppToastStackProps) => (
  <aside className="fixed bottom-4 right-4 z-50 space-y-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`w-80 animate-rise-in rounded-xl border px-4 py-3 text-sm shadow-lg ${
          toast.tone === "ok"
            ? "border-success/40 bg-success/20 text-green-100"
            : "border-danger/40 bg-danger/20 text-red-100"
        }`}
      >
        {toast.message}
      </div>
    ))}
  </aside>
);

```


### CREATE `apps/web/src/features/kml-postes/KmlPostePage.tsx`

```tsx
import { useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { KmlPosteStandardizeResponse } from "./api/kmlPosteApi";

type DetectionMode = "auto" | "all-points" | "folder-postes";

interface KmlPostePageProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const decodeBase64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const triggerDownload = (fileName: string, base64: string, mimeType: string) => {
  const blob = decodeBase64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const KmlPostePage = ({ onError, onToast }: KmlPostePageProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [prefix, setPrefix] = useState("POSTE-TAF-");
  const [startAt, setStartAt] = useState("1");
  const [mode, setMode] = useState<DetectionMode>("auto");
  const [ignoreNames, setIgnoreNames] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<KmlPosteStandardizeResponse | null>(null);

  const previewMappings = useMemo(() => result?.mappings.slice(0, 20) ?? [], [result]);

  const submit = async () => {
    if (!file) {
      onError("Selecione um arquivo KML ou KMZ");
      return;
    }

    const effectivePrefix = prefix.trim();
    if (!effectivePrefix) {
      onError("Informe o prefixo de nomenclatura");
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("prefix", effectivePrefix);
    form.set("startAt", startAt || "1");
    form.set("mode", mode);
    form.set("ignoreNames", ignoreNames);

    setIsSubmitting(true);

    try {
      const response = await api.standardizeKmlPostes(form);
      setResult(response);
      onToast(`Padronizacao concluida: ${response.summary.renamedCount} postes renomeados`);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Falha ao processar arquivo KML/KMZ";
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-panel p-5">
        <div className="mb-4">
          <h2 className="font-display text-xl text-textMain">Padronizador de postes KML/KMZ</h2>
          <p className="mt-1 text-sm text-textMuted">
            Faz upload do arquivo, reconhece os placemarks de ponto e devolve KML, KMZ e CSV de
            mapeamento no mesmo fluxo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Arquivo</span>
            <input
              accept=".kml,.kmz"
              className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
              type="file"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Prefixo</span>
            <input
              className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => setPrefix(event.target.value)}
              placeholder="POSTE-TAF-U.R"
              value={prefix}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Numero inicial</span>
            <input
              className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
              min="1"
              onChange={(event) => setStartAt(event.target.value)}
              type="number"
              value={startAt}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Modo de reconhecimento</span>
            <select
              className="block w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => setMode(event.target.value as DetectionMode)}
              value={mode}
            >
              <option value="auto">Auto</option>
              <option value="all-points">Todos os pontos</option>
              <option value="folder-postes">Somente pasta Poste/Postes</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="block text-sm text-textMuted">
            Ignorar nomes exatos (um por linha ou separados por virgula)
          </span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
            onChange={(event) => setIgnoreNames(event.target.value)}
            placeholder={"E.B-01\nMarcador especial"}
            value={ignoreNames}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Processando..." : "Padronizar arquivo"}
          </button>

          {result && (
            <>
              <button
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(
                    result.outputs.kmlFileName,
                    result.outputs.kmlBase64,
                    "application/vnd.google-earth.kml+xml"
                  )
                }
                type="button"
              >
                Baixar KML
              </button>
              <button
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(
                    result.outputs.kmzFileName,
                    result.outputs.kmzBase64,
                    "application/vnd.google-earth.kmz"
                  )
                }
                type="button"
              >
                Baixar KMZ
              </button>
              <button
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(result.outputs.csvFileName, result.outputs.csvBase64, "text/csv")
                }
                type="button"
              >
                Baixar CSV
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-700 bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Renomeados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.renamedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Ignorados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.ignoredCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pulados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.skippedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pontos</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.totalPointPlacemarkCount}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-panel p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-textMain">Previa das renomeacoes</h3>
                <p className="text-sm text-textMuted">
                  Mostrando as primeiras {previewMappings.length} entradas do mapeamento.
                </p>
              </div>
              <span className="rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-xs text-textMuted">
                modo: {result.summary.mode}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-textMuted">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Nome antigo</th>
                    <th className="px-3 py-2 font-medium">Novo nome</th>
                    <th className="px-3 py-2 font-medium">Pasta</th>
                    <th className="px-3 py-2 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMappings.map((item) => (
                    <tr key={`${item.sequence}-${item.newName}`} className="border-b border-slate-800">
                      <td className="px-3 py-2 text-textMuted">{item.sequence}</td>
                      <td className="px-3 py-2 text-textMain">{item.oldName || "-"}</td>
                      <td className="px-3 py-2 font-medium text-accent">{item.newName}</td>
                      <td className="px-3 py-2 text-textMuted">
                        {item.folderPath.length > 0 ? item.folderPath.join(" / ") : "-"}
                      </td>
                      <td className="px-3 py-2 text-textMuted">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.ignoredNames.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-panelAlt p-3">
                <p className="text-sm font-medium text-textMain">Ignorados</p>
                <p className="mt-1 text-sm text-textMuted">{result.ignoredNames.join(", ")}</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

```


### CREATE `apps/web/src/features/kml-postes/api/kmlPosteApi.ts`

```ts
import { request } from "../../../lib/apiCore";

export interface KmlPosteMappingItem {
  sequence: number;
  oldName: string;
  newName: string;
  folderPath: string[];
  reason: string;
}

export interface KmlPosteSummary {
  mode: "auto" | "all-points" | "folder-postes";
  prefix: string;
  startAt: number;
  renamedCount: number;
  ignoredCount: number;
  skippedCount: number;
  totalPlacemarkCount: number;
  totalPointPlacemarkCount: number;
  nextValue: number;
}

export interface KmlPosteOutputs {
  kmlFileName: string;
  kmlBase64: string;
  kmzFileName: string;
  kmzBase64: string;
  csvFileName: string;
  csvBase64: string;
}

export interface KmlPosteStandardizeResponse {
  summary: KmlPosteSummary;
  mappings: KmlPosteMappingItem[];
  ignoredNames: string[];
  skippedNames: string[];
  outputs: KmlPosteOutputs;
}

export const kmlPosteApi = {
  standardizeKmlPostes: (payload: FormData) =>
    request<KmlPosteStandardizeResponse>("/kml-postes/standardize", {
      method: "POST",
      body: payload
    }),

  kmlPosteHealth: () =>
    request<{ status: string; module: string }>("/kml-postes/health")
};

```


### REPLACE `apps/web/src/lib/api.ts`

```ts
import { adminApi } from "./apiAdmin";
import { authApi } from "./apiAuth";
import { notificationApi } from "./apiNotifications";
import { reminderApi } from "./apiReminders";
import { webPushApi } from "./apiWebPush";
import { taskApi } from "../features/tasks/api/tasksApi";
import { kmlPosteApi } from "../features/kml-postes/api/kmlPosteApi";

export { ApiError } from "./apiCore";

export const api = {
  ...authApi,
  ...adminApi,
  ...taskApi,
  ...notificationApi,
  ...reminderApi,
  ...webPushApi,
  ...kmlPosteApi
};

```


### REPLACE `apps/web/src/lib/featureFlags.ts`

```ts
export const isAprModuleEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_APR_MODULE === "true";

export const isKmlPosteModuleEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_KML_POSTE_MODULE === "true";

```


### CREATE `packages/poste-kml-core/package.json`

```json
{
  "name": "@noctification/poste-kml-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@xmldom/xmldom": "^0.8.11"
  }
}

```


### CREATE `packages/poste-kml-core/src/index.ts`

```ts
export * from "./types.js";
export * from "./standardize.js";

```


### CREATE `packages/poste-kml-core/src/types.ts`

```ts
export type DetectionMode = "auto" | "all-points" | "folder-postes";

export interface StandardizePosteOptions {
  prefix: string;
  startAt?: number;
  ignoreNames?: string[];
  mode?: DetectionMode;
  minPadding?: number;
}

export interface PosteMappingItem {
  sequence: number;
  oldName: string;
  newName: string;
  folderPath: string[];
  reason: string;
}

export interface StandardizePosteSummary {
  mode: DetectionMode;
  prefix: string;
  startAt: number;
  renamedCount: number;
  ignoredCount: number;
  skippedCount: number;
  totalPlacemarkCount: number;
  totalPointPlacemarkCount: number;
  nextValue: number;
}

export interface StandardizePosteResult {
  xml: string;
  mappings: PosteMappingItem[];
  ignoredNames: string[];
  skippedNames: string[];
  summary: StandardizePosteSummary;
}

```


### CREATE `packages/poste-kml-core/src/standardize.ts`

```ts
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type {
  DetectionMode,
  PosteMappingItem,
  StandardizePosteOptions,
  StandardizePosteResult
} from "./types.js";

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const MARKER_NAME_PATTERN = /^(?:marcador\s*\d+|p\d+|\d+)$/i;
const EXCLUDED_KEYWORDS = [
  "nap",
  "splitter",
  "fusao",
  "fusão",
  "cabo",
  "cabos",
  "cliente",
  "clientes",
  "caixa",
  "fibra",
  "cto",
  "emenda",
  "dgo",
  "dio"
];
const POSTE_FOLDER_PATTERN = /\bposte(?:s)?\b/i;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "")
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForCompare = (value: string | null | undefined): string =>
  normalizeText(value).toLowerCase();

const localNameOf = (node: Node | null | undefined): string =>
  ((node as Element | null)?.localName ?? (node as Element | null)?.nodeName ?? "")
    .split(":")
    .pop()
    ?.trim() ?? "";

const isElementNode = (node: Node | null | undefined): node is Element =>
  Boolean(node) && node?.nodeType === node?.ELEMENT_NODE;

const getDirectChildElement = (element: Element, tagName: string): Element | null => {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (isElementNode(child) && localNameOf(child) === tagName) {
      return child;
    }
  }

  return null;
};

const getDirectChildText = (element: Element, tagName: string): string => {
  const child = getDirectChildElement(element, tagName);
  return normalizeText(child?.textContent);
};

const setDirectChildText = (element: Element, tagName: string, value: string): void => {
  const child = getDirectChildElement(element, tagName);
  if (child) {
    child.textContent = value;
    return;
  }

  const doc = element.ownerDocument;
  const created = doc.createElement(tagName);
  created.appendChild(doc.createTextNode(value));

  if (element.firstChild) {
    element.insertBefore(created, element.firstChild);
  } else {
    element.appendChild(created);
  }
};

const collectDescendants = (element: Element): Element[] => {
  const items: Element[] = [];

  const visit = (current: Element) => {
    for (let index = 0; index < current.childNodes.length; index += 1) {
      const child = current.childNodes.item(index);
      if (!isElementNode(child)) {
        continue;
      }

      items.push(child);
      visit(child);
    }
  };

  visit(element);
  return items;
};

const hasDescendantTag = (element: Element, tagName: string): boolean =>
  collectDescendants(element).some((child) => localNameOf(child) === tagName);

const getFolderPath = (element: Element): string[] => {
  const folders: string[] = [];
  let current = element.parentNode;

  while (current) {
    if (isElementNode(current) && localNameOf(current) === "Folder") {
      const folderName = getDirectChildText(current, "name");
      if (folderName) {
        folders.unshift(folderName);
      }
    }

    current = current.parentNode;
  }

  return folders;
};

const getPlacemarkElementsInDocumentOrder = (doc: Document): Element[] => {
  const items: Element[] = [];
  const root = doc.documentElement;

  const visit = (current: Element) => {
    if (localNameOf(current) === "Placemark") {
      items.push(current);
    }

    for (let index = 0; index < current.childNodes.length; index += 1) {
      const child = current.childNodes.item(index);
      if (isElementNode(child)) {
        visit(child);
      }
    }
  };

  visit(root);
  return items;
};

const buildName = (prefix: string, value: number, minPadding: number): string => {
  const targetPadding = Math.max(minPadding, value >= 100 ? String(value).length : 2);
  return `${prefix}-${String(value).padStart(targetPadding, "0")}`;
};

interface PlacemarkDecision {
  shouldRename: boolean;
  ignored: boolean;
  reason: string;
  oldName: string;
  folderPath: string[];
  isPointPlacemark: boolean;
}

const decidePlacemark = (
  placemark: Element,
  mode: DetectionMode,
  ignoredNames: Set<string>
): PlacemarkDecision => {
  const oldName = getDirectChildText(placemark, "name");
  const normalizedName = normalizeForCompare(oldName);
  const folderPath = getFolderPath(placemark);
  const pathText = folderPath.join(" ");
  const description = getDirectChildText(placemark, "description");
  const combinedText = [oldName, description, pathText].join(" ");
  const combinedNormalized = normalizeForCompare(combinedText);
  const isPointPlacemark = hasDescendantTag(placemark, "Point");
  const hasExcludedGeometry =
    hasDescendantTag(placemark, "LineString") ||
    hasDescendantTag(placemark, "Polygon") ||
    hasDescendantTag(placemark, "Model") ||
    hasDescendantTag(placemark, "Track");

  if (!isPointPlacemark || hasExcludedGeometry) {
    return {
      shouldRename: false,
      ignored: false,
      reason: "nao-e-poste",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (normalizedName && ignoredNames.has(normalizedName)) {
    return {
      shouldRename: false,
      ignored: true,
      reason: "ignorado",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (mode === "all-points") {
    return {
      shouldRename: true,
      ignored: false,
      reason: "todos-os-pontos",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  const pathHasPoste = POSTE_FOLDER_PATTERN.test(pathText);
  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some((keyword) =>
    combinedNormalized.includes(keyword)
  );

  if (mode === "folder-postes") {
    return {
      shouldRename: pathHasPoste,
      ignored: false,
      reason: pathHasPoste ? "pasta-postes" : "fora-da-pasta-postes",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (hasExcludedKeyword) {
    return {
      shouldRename: false,
      ignored: false,
      reason: "palavra-excluida",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (pathHasPoste || MARKER_NAME_PATTERN.test(normalizeText(oldName))) {
    return {
      shouldRename: true,
      ignored: false,
      reason: pathHasPoste ? "pasta-postes" : "padrao-de-marcador",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  return {
    shouldRename: true,
    ignored: false,
    reason: "ponto-valido",
    oldName,
    folderPath,
    isPointPlacemark
  };
};

export const standardizePosteKml = (
  xml: string,
  options: StandardizePosteOptions
): StandardizePosteResult => {
  const prefix = normalizeText(options.prefix);
  if (!prefix) {
    throw new Error("prefix obrigatorio");
  }

  const parser = new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: () => undefined,
      fatalError: () => undefined
    }
  });

  const doc = parser.parseFromString(xml, "application/xml");
  const placemarks = getPlacemarkElementsInDocumentOrder(doc);
  const mode = options.mode ?? "auto";
  const ignoredNames = new Set((options.ignoreNames ?? []).map((item) => normalizeForCompare(item)));
  const startAt = Number.isFinite(options.startAt) ? Math.max(1, Number(options.startAt)) : 1;
  const minPadding = Math.max(2, options.minPadding ?? 2);

  let nextValue = startAt;
  const mappings: PosteMappingItem[] = [];
  const ignored: string[] = [];
  const skipped: string[] = [];
  let pointPlacemarkCount = 0;

  for (const placemark of placemarks) {
    const decision = decidePlacemark(placemark, mode, ignoredNames);
    if (decision.isPointPlacemark) {
      pointPlacemarkCount += 1;
    }

    if (decision.ignored) {
      if (decision.oldName) {
        ignored.push(decision.oldName);
      }
      continue;
    }

    if (!decision.shouldRename) {
      if (decision.oldName) {
        skipped.push(decision.oldName);
      }
      continue;
    }

    const newName = buildName(prefix, nextValue, minPadding);
    setDirectChildText(placemark, "name", newName);

    mappings.push({
      sequence: nextValue,
      oldName: decision.oldName,
      newName,
      folderPath: decision.folderPath,
      reason: decision.reason
    });

    nextValue += 1;
  }

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(doc);

  return {
    xml: serialized,
    mappings,
    ignoredNames: ignored,
    skippedNames: skipped,
    summary: {
      mode,
      prefix,
      startAt,
      renamedCount: mappings.length,
      ignoredCount: ignored.length,
      skippedCount: skipped.length,
      totalPlacemarkCount: placemarks.length,
      totalPointPlacemarkCount: pointPlacemarkCount,
      nextValue
    }
  };
};

```


### CREATE `packages/poste-kml-core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "types": ["node", "vitest/globals"],
    "noEmit": true
  },
  "include": ["src"]
}

```


### CREATE `packages/poste-kml-core/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "sourceMap": false
  },
  "exclude": ["src/**/*.test.ts"]
}

```


## Critérios de aceite

- O backend deve expor `POST /api/v1/kml-postes/standardize` quando `ENABLE_KML_POSTE_MODULE=true`.

- O frontend admin deve mostrar a aba `/kml-postes` quando `VITE_ENABLE_KML_POSTE_MODULE=true`.

- O módulo deve aceitar upload de `.kml` e `.kmz`, gerar KML padronizado, KMZ padronizado e CSV de mapeamento.

- O pacote compartilhado deve ficar em `packages/poste-kml-core`.

- O fluxo deve manter a ordem documental do KML e suportar modos `auto`, `all-points` e `folder-postes`.
