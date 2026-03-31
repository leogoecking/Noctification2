import type { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";

export const registerReminderAdminRoutes = (
  router: Router,
  db: Database.Database,
  config: AppConfig
): void => {
  router.get("/reminders/health", (_req, res) => {
    void db;
    void config;
    res.status(403).json({ error: "Admins nao podem acessar metricas de lembretes pessoais" });
  });

  router.get("/reminders", (req, res) => {
    void req;
    res.status(403).json({ error: "Lembretes pessoais nao ficam acessiveis no escopo administrativo" });
  });

  router.post("/reminders", (_req, res) => {
    res.status(403).json({ error: "Admins nao podem criar lembretes para outros usuarios" });
  });

  router.get("/reminder-occurrences", (req, res) => {
    void req;
    res.status(403).json({ error: "Admins nao podem acessar ocorrencias de lembretes pessoais" });
  });

  router.get("/reminder-logs", (req, res) => {
    void req;
    res.status(403).json({ error: "Admins nao podem acessar logs de lembretes pessoais" });
  });

  router.patch("/reminders/:id/toggle", (req, res) => {
    void req;
    res.status(403).json({ error: "Admins nao podem alterar lembretes de outros usuarios" });
  });

  router.patch("/reminders/:id", (req, res) => {
    void req;
    res.status(403).json({ error: "Admins nao podem editar lembretes de outros usuarios" });
  });

  router.delete("/reminders/:id", (_req, res) => {
    res.status(403).json({ error: "Admins nao podem arquivar lembretes de outros usuarios" });
  });
};
