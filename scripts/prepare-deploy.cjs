#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_ROOT_PLACEHOLDER = "__APP_ROOT__";
const SYSTEM_USER_PLACEHOLDER = "__SYSTEM_USER__";
const SYSTEM_GROUP_PLACEHOLDER = "__SYSTEM_GROUP__";
const SYSTEM_ENV_FILE_PLACEHOLDER = "__SYSTEM_ENV_FILE__";

const PLACEHOLDER_VALUES = new Set([
  "CHANGE_ME_TO_A_LONG_RANDOM_SECRET",
  "CHANGE_ME_ADMIN_LOGIN",
  "CHANGE_ME_ADMIN_PASSWORD",
  "http://IP_DA_VM"
]);

const parseArgs = (argv) => {
  const options = {
    appRoot: PROJECT_ROOT,
    localEnvFile: path.join(PROJECT_ROOT, ".deploy/shared/api.env"),
    systemEnvFile: path.join(PROJECT_ROOT, ".deploy/shared/api.env"),
    systemUser: process.env.SUDO_USER || os.userInfo().username,
    systemGroup: null,
    requireRealEnv: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--require-real-env") {
      options.requireRealEnv = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--app-root":
        options.appRoot = path.resolve(value);
        break;
      case "--local-env-file":
        options.localEnvFile = path.resolve(value);
        break;
      case "--system-env-file":
        options.systemEnvFile = path.resolve(value);
        break;
      case "--system-user":
        options.systemUser = value;
        break;
      case "--system-group":
        options.systemGroup = value;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }

    index += 1;
  }

  if (!options.systemGroup) {
    try {
      options.systemGroup = execFileSync("id", ["-gn", options.systemUser], {
        encoding: "utf8"
      }).trim();
    } catch {
      options.systemGroup = options.systemUser;
    }
  }

  return options;
};

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const replaceAll = (content, replacements) =>
  replacements.reduce(
    (accumulator, [searchValue, replaceValue]) => accumulator.split(searchValue).join(replaceValue),
    content
  );

const renderTemplate = (templatePath, outputPath, replacements) => {
  const content = fs.readFileSync(templatePath, "utf8");
  const rendered = replaceAll(content, replacements);
  fs.writeFileSync(outputPath, rendered);
};

const updateEnvFile = (envFilePath, appRoot) => {
  if (!fs.existsSync(envFilePath)) {
    const templatePath = path.join(PROJECT_ROOT, "ops/systemd/api.env.example");
    const content = replaceAll(fs.readFileSync(templatePath, "utf8"), [[APP_ROOT_PLACEHOLDER, appRoot]]);
    fs.writeFileSync(envFilePath, content);
  }

  const lines = fs.readFileSync(envFilePath, "utf8").split(/\r?\n/);
  let appRootWritten = false;

  const updated = lines.map((line) => {
    if (line.startsWith("APP_ROOT=")) {
      appRootWritten = true;
      return `APP_ROOT=${appRoot}`;
    }

    return line;
  });

  if (!appRootWritten) {
    updated.push(`APP_ROOT=${appRoot}`);
  }

  fs.writeFileSync(envFilePath, `${updated.join("\n").replace(/\n+$/, "")}\n`);
  fs.chmodSync(envFilePath, 0o600);
};

const readEnvMap = (envFilePath) => {
  const values = new Map();
  const content = fs.readFileSync(envFilePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values.set(key, value);
  }

  return values;
};

const validateEnv = (envFilePath) => {
  const envValues = readEnvMap(envFilePath);

  for (const key of ["JWT_SECRET", "ADMIN_LOGIN", "ADMIN_PASSWORD", "CORS_ORIGIN"]) {
    const value = envValues.get(key);
    if (!value) {
      throw new Error(`${key} is missing in ${envFilePath}`);
    }

    if (PLACEHOLDER_VALUES.has(value)) {
      throw new Error(`${key} still uses a template placeholder in ${envFilePath}`);
    }
  }

  if (envValues.get("ALLOW_INSECURE_FIXED_ADMIN") !== "false") {
    throw new Error(`ALLOW_INSECURE_FIXED_ADMIN must be false in ${envFilePath}`);
  }

  if (envValues.get("ADMIN_LOGIN") === "admin" && envValues.get("ADMIN_PASSWORD") === "admin") {
    throw new Error(`ADMIN_LOGIN/ADMIN_PASSWORD still use admin/admin in ${envFilePath}`);
  }
};

const log = (message) => {
  process.stdout.write(`[prepare:deploy] ${message}\n`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const deployRoot = path.join(PROJECT_ROOT, ".deploy");
  const replacements = [
    [APP_ROOT_PLACEHOLDER, options.appRoot],
    [SYSTEM_USER_PLACEHOLDER, options.systemUser],
    [SYSTEM_GROUP_PLACEHOLDER, options.systemGroup],
    [SYSTEM_ENV_FILE_PLACEHOLDER, options.systemEnvFile]
  ];

  ensureDir(path.join(deployRoot, "shared/backups"));
  ensureDir(path.join(deployRoot, "shared/logs"));
  ensureDir(path.dirname(options.localEnvFile));
  ensureDir(path.join(deployRoot, "systemd"));
  ensureDir(path.join(deployRoot, "nginx"));
  ensureDir(path.join(deployRoot, "cron"));

  updateEnvFile(options.localEnvFile, options.appRoot);

  if (options.requireRealEnv) {
    validateEnv(options.localEnvFile);
  }

  renderTemplate(
    path.join(PROJECT_ROOT, "ops/systemd/noctification-api.service"),
    path.join(deployRoot, "systemd/noctification-api.service"),
    replacements
  );
  renderTemplate(
    path.join(PROJECT_ROOT, "ops/nginx/noctification.conf"),
    path.join(deployRoot, "nginx/noctification.conf"),
    replacements
  );
  renderTemplate(
    path.join(PROJECT_ROOT, "ops/cron/noctification-db-backup.cron"),
    path.join(deployRoot, "cron/noctification-db-backup.cron"),
    replacements
  );

  log(`APP_ROOT=${options.appRoot}`);
  log(`system user/group=${options.systemUser}:${options.systemGroup}`);
  log(`env file=${options.localEnvFile}`);
  log("local deploy artifacts rendered in .deploy/");
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[prepare:deploy] FAIL: ${message}\n`);
  process.exit(1);
}
