import path from "node:path";
import { config } from "../config";
import { connectDatabase, runMigrations } from "../db";

const db = connectDatabase(config.dbPath);
runMigrations(db, path.resolve(process.cwd(), "migrations"));

console.log("Migrations applied successfully.");
db.close();
