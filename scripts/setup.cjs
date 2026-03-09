const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");

const npmRunner = (() => {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      prefixArgs: [process.env.npm_execpath]
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    prefixArgs: []
  };
})();

const run = (args, options = {}) => {
  const result = spawnSync(npmRunner.command, [...npmRunner.prefixArgs, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.error) {
    console.error(`[setup] failed to run npm command: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const ensureEnv = (examplePath, envPath) => {
  if (fs.existsSync(envPath)) {
    console.log(`[setup] found ${path.relative(rootDir, envPath)} (keeping existing file)`);
    return;
  }

  fs.copyFileSync(examplePath, envPath);
  console.log(`[setup] created ${path.relative(rootDir, envPath)} from example`);
};

const main = () => {
  console.log("[setup] installing dependencies...");
  run(["install"]);

  const apiEnvExample = path.join(rootDir, "apps", "api", ".env.example");
  const apiEnv = path.join(rootDir, "apps", "api", ".env");
  const webEnvExample = path.join(rootDir, "apps", "web", ".env.example");
  const webEnv = path.join(rootDir, "apps", "web", ".env");

  ensureEnv(apiEnvExample, apiEnv);
  ensureEnv(webEnvExample, webEnv);

  console.log("[setup] running migrations...");
  run(["run", "migrate", "--workspace", "@noctification/api"]);

  console.log("[setup] bootstrapping admin...");
  run(["run", "bootstrap-admin", "--workspace", "@noctification/api"]);

  console.log("");
  console.log("[setup] done.");
  console.log("[setup] next: npm run dev");
};

main();
