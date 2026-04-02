import { Router } from "express";
import type Database from "better-sqlite3";
import { nowIso } from "../db";

const MAX_KEY_LENGTH = 128;
const MAX_VALUE_JSON_BYTES = 64 * 1024; // 64 KB

interface SettingRow {
  value_json: string;
}

export const createMeSettingsRouter = (db: Database.Database): Router => {
  const router = Router();

  router.get("/:key", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const { key } = req.params;
    if (!key || key.length > MAX_KEY_LENGTH) {
      res.status(400).json({ error: "Chave invalida" });
      return;
    }

    const row = db
      .prepare("SELECT value_json FROM user_settings WHERE user_id = ? AND key = ?")
      .get(req.authUser.id, key) as SettingRow | undefined;

    if (!row) {
      res.json({ value: null });
      return;
    }

    try {
      res.json({ value: JSON.parse(row.value_json) });
    } catch {
      res.json({ value: null });
    }
  });

  router.put("/:key", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const { key } = req.params;
    if (!key || key.length > MAX_KEY_LENGTH) {
      res.status(400).json({ error: "Chave invalida" });
      return;
    }

    if (req.body === undefined || !("value" in req.body)) {
      res.status(400).json({ error: "Campo 'value' obrigatorio" });
      return;
    }

    let valueJson: string;
    try {
      valueJson = JSON.stringify(req.body.value);
    } catch {
      res.status(400).json({ error: "Valor nao serializavel" });
      return;
    }

    if (Buffer.byteLength(valueJson, "utf8") > MAX_VALUE_JSON_BYTES) {
      res.status(400).json({ error: "Valor muito grande" });
      return;
    }

    db.prepare(
      `INSERT INTO user_settings (user_id, key, value_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    ).run(req.authUser.id, key, valueJson, nowIso());

    res.json({ value: req.body.value });
  });

  return router;
};
