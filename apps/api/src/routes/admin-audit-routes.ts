import type { Router } from "express";
import type Database from "better-sqlite3";
import { buildAdminAuditWhere, fetchAdminAuditEvents } from "./admin-audit-helpers";
import { parseLimit, parsePage } from "./admin-route-shared";
import { toNullableString } from "./admin-user-helpers";

export const registerAdminAuditRoutes = (router: Router, db: Database.Database): void => {
  router.get("/audit", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const page = parsePage(req.query.page, 1);
    const offset = (page - 1) * limit;
    const eventType = toNullableString(req.query.event_type);
    const from = toNullableString(req.query.from);
    const to = toNullableString(req.query.to);

    const { whereClause, values } = buildAdminAuditWhere({
      eventType,
      from,
      to
    });
    const { events, total } = fetchAdminAuditEvents({
      db,
      whereClause,
      values,
      limit,
      offset
    });
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  });
};
