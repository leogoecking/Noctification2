#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const parseArgs = (argv) => {
  const options = {
    appRoot: PROJECT_ROOT,
    localEnvFile: path.join(PROJECT_ROOT, ".deploy/shared/api.env"),
    systemEnvFile: path.join(PROJECT_ROOT, ".deploy/shared/api.env"),
    systemUser: process.env.SUDO_USER || os.userInfo().username,
    systemGroup: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
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

const run = (command, args, label) => {
  process.stdout.write(`[check:deploy] ${label}\n`);
  execFileSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env
  });
};

const assertFile = (targetPath, description) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${description} not found: ${targetPath}`);
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));

  run(
    "node",
    [
      "scripts/prepare-deploy.cjs",
      "--require-real-env",
      "--app-root",
      options.appRoot,
      "--local-env-file",
      options.localEnvFile,
      "--system-env-file",
      options.systemEnvFile,
      "--system-user",
      options.systemUser,
      "--system-group",
      options.systemGroup
    ],
    "rendering .deploy and validating env"
  );

  run("bash", ["-n", ".deploy/install-system.sh"], "checking .deploy/install-system.sh syntax");
  run("bash", ["-n", "ops/scripts/deploy-debian.sh"], "checking ops/scripts/deploy-debian.sh syntax");
  run("bash", ["-n", "ops/scripts/backup-db.sh"], "checking ops/scripts/backup-db.sh syntax");
  run(
    "bash",
    ["-n", "ops/scripts/validate-debian-login.sh"],
    "checking ops/scripts/validate-debian-login.sh syntax"
  );
  run("npm", ["run", "build"], "building api and web");

  assertFile(path.join(options.appRoot, "apps/api/dist/index.js"), "API build artifact");
  assertFile(path.join(options.appRoot, "apps/web/dist/index.html"), "Web build artifact");

  process.stdout.write("[check:deploy] PASS: env, templates, scripts and build are ready for sudo install\n");
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[check:deploy] FAIL: ${message}\n`);
  process.exit(1);
}
