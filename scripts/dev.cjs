const { spawn } = require("node:child_process");

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

const procs = [];
let shuttingDown = false;

const start = (label, args) => {
  const child = spawn(npmRunner.command, [...npmRunner.prefixArgs, ...args], {
    stdio: "inherit",
    shell: false
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[dev] failed to start ${label}: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.log(`[dev] ${label} stopped by signal ${signal}`);
    } else if (code !== 0) {
      console.log(`[dev] ${label} exited with code ${code}`);
    }

    shutdown(code ?? 1);
  });

  procs.push(child);
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of procs) {
    if (!child.killed) {
      try {
        child.kill("SIGINT");
      } catch {
        // Ignore kill errors to keep shutdown resilient.
      }
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[dev] starting API and web...");
start("api", ["run", "dev", "--workspace", "@noctification/api"]);
start("web", ["run", "dev", "--workspace", "@noctification/web"]);
