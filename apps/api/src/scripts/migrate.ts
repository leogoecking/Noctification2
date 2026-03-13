import { config } from "../config";
import { connectDatabase, runMigrations } from "../db";
import { apiMigrationsDir } from "../paths";

const db = connectDatabase(config.dbPath);
runMigrations(db, apiMigrationsDir);

console.log("Migrations applied successfully.");
db.close();
