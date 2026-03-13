import { createServer } from "node:http";
import { config } from "./config";
import { connectDatabase, runMigrations } from "./db";
import { apiMigrationsDir } from "./paths";
import { setupSocket } from "./socket";
import { createApp } from "./app";

const boot = () => {
  const db = connectDatabase(config.dbPath);
  runMigrations(db, apiMigrationsDir);

  const httpServer = createServer();
  const io = setupSocket(httpServer, db, config);
  const app = createApp(db, io, config);

  httpServer.on("request", app);

  httpServer.listen(config.port, () => {
    console.log(`[api] listening on http://0.0.0.0:${config.port}`);
  });

  const shutdown = () => {
    io.close(() => {
      httpServer.close(() => {
        db.close();
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

boot();
