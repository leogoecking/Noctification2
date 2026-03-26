#!/usr/bin/env node

const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const HOSTNAME = process.env.NOCTIFICATION_HOSTNAME || "noctification.lan";

const run = (args, label) => {
  process.stdout.write(`[prepare:local-lan] ${label}\n`);
  execFileSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env
  });
};

const main = () => {
  run(
    [
      path.join(PROJECT_ROOT, "scripts/prepare-deploy.cjs"),
      "--app-root",
      PROJECT_ROOT,
      "--local-env-file",
      path.join(PROJECT_ROOT, ".deploy/shared/api.env"),
      "--system-env-file",
      "/etc/noctification/api.env"
    ],
    "rendering deploy artifacts from the current clone path"
  );

  process.stdout.write(
    [
      `[prepare:local-lan] APP_ROOT detected as ${PROJECT_ROOT}`,
      `[prepare:local-lan] expected hostname: https://${HOSTNAME}`,
      "[prepare:local-lan] next suggested steps:",
      "  1. review .deploy/shared/api.env",
      "  2. generate local certs with: bash ops/scripts/generate-local-certs.sh",
      "  3. install certs and nginx/systemd files with sudo",
      "  4. point the hostname to this machine in local DNS or hosts files"
    ].join("\n") + "\n"
  );
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[prepare:local-lan] FAIL: ${message}\n`);
  process.exit(1);
}
