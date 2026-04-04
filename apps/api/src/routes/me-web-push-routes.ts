import type { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";
import { getWebPushConfigResponse } from "../push/service";
import {
  deleteUserWebPushSubscription,
  saveUserWebPushSubscription
} from "./me-web-push-helpers";
import { requireAuthUser } from "./me-route-shared";

interface RegisterMeWebPushRoutesParams {
  router: Router;
  db: Database.Database;
  config: AppConfig;
}

export const registerMeWebPushRoutes = ({
  router,
  db,
  config
}: RegisterMeWebPushRoutesParams) => {
  router.get("/web-push/config", (_req, res) => {
    res.json(getWebPushConfigResponse(config));
  });

  router.put("/web-push/subscription", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const result = saveUserWebPushSubscription(db, config, {
      userId: authUser.id,
      body: req.body,
      userAgent:
        typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ ok: true });
  });

  router.delete("/web-push/subscription", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const result = deleteUserWebPushSubscription(db, {
      userId: authUser.id,
      body: req.body
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });
};
