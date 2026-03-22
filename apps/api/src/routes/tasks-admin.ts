import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { nowIso } from "../db";
import { authenticate, requireRole } from "../middleware/auth";
import { buildTaskAutomationHealth, listTaskAutomationLogs } from "../tasks/automation";
import { createTaskLinkedNotification, dispatchTaskLinkedNotification } from "../tasks/notifications";
import {
  activeUserExists,
  fetchTaskById,
  isTaskTerminal,
  listTaskEvents,
  logTaskAudit,
  logTaskEvent,
  normalizeTaskRow,
  parseLimit,
  parseNonTerminalTaskStatus,
  parseOptionalDueAt,
  parseOptionalUserId,
  parsePage,
  parseTaskPriority,
  parseTaskRepeatType,
  parseTaskStatus,
  parseTaskWeekdays,
  stringifyTaskWeekdays,
  taskSelectSql,
  toNullableString,
  validateTaskDescription,
  validateTaskRecurrence,
  validateTaskTitle,
  type TaskRow
} from "../tasks/service";
import type { TaskStatus } from "../types";

const ADMIN_TASK_ORDER_BY = `
  ORDER BY
    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END ASC,
    t.due_at ASC,
    t.created_at DESC,
    t.id DESC
`;

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Nova",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluida",
  cancelled: "Cancelada"
};

const buildTaskAssignmentMessage = (
  taskTitle: string,
  actorName: string,
  dueAt: string | null
): string => {
  const dueSuffix = dueAt ? ` Prazo atual: ${dueAt}.` : "";
  return `${actorName} atribuiu a tarefa "${taskTitle}" para voce.${dueSuffix}`;
};

const buildTaskStatusMessage = (
  taskTitle: string,
  actorName: string,
  status: TaskStatus
): string => `${actorName} atualizou a tarefa "${taskTitle}" para ${TASK_STATUS_LABELS[status]}.`;

const buildRecipientIds = (...values: Array<number | null | undefined>): number[] =>
  Array.from(
    new Set(values.filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0))
  );

export const createTaskAdminRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskAdminRouterWithIo(db, null, config);
};

export const createTaskAdminRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));

  router.get("/tasks/health", (_req, res) => {
    res.json({
      health: buildTaskAutomationHealth(db, config)
    });
  });

  router.get("/tasks/automation-logs", (req, res) => {
    const automationTypeRaw = toNullableString(req.query.automation_type);
    const automationType =
      automationTypeRaw === "due_soon" ||
      automationTypeRaw === "overdue" ||
      automationTypeRaw === "stale_task" ||
      automationTypeRaw === "recurring_task"
        ? automationTypeRaw
        : automationTypeRaw === null
          ? ""
          : null;
    const taskIdRaw = Number(req.query.task_id);
    const taskId = Number.isInteger(taskIdRaw) && taskIdRaw > 0 ? taskIdRaw : null;
    const limit = parseLimit(req.query.limit, 100, 300);

    if (automationTypeRaw && !automationType) {
      res.status(400).json({ error: "automation_type invalido" });
      return;
    }

    const logs = listTaskAutomationLogs(db, {
      automationType: automationType ?? "",
      taskId,
      limit
    }).map((item) => ({
      ...item,
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : null
    }));

    res.json({ logs });
  });

  router.get("/tasks", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const page = parsePage(req.query.page, 1);
    const offset = (page - 1) * limit;
    const status = toNullableString(req.query.status);
    const priority = toNullableString(req.query.priority);
    const dueBefore = toNullableString(req.query.due_before);
    const dueAfter = toNullableString(req.query.due_after);
    const assigneeUserId = parseOptionalUserId(req.query.assignee_user_id);
    const creatorUserId = parseOptionalUserId(req.query.creator_user_id);
    const includeArchived = String(req.query.include_archived ?? "").toLowerCase() === "true";

    if (status && !parseTaskStatus(status)) {
      res.status(400).json({ error: "status invalido" });
      return;
    }

    if (priority && !parseTaskPriority(priority)) {
      res.status(400).json({ error: "priority invalida" });
      return;
    }

    if (req.query.assignee_user_id !== undefined && assigneeUserId === undefined) {
      res.status(400).json({ error: "assignee_user_id invalido" });
      return;
    }

    if (req.query.creator_user_id !== undefined && creatorUserId === undefined) {
      res.status(400).json({ error: "creator_user_id invalido" });
      return;
    }

    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (!includeArchived) {
      conditions.push("t.archived_at IS NULL");
    }

    if (status) {
      conditions.push("t.status = ?");
      values.push(status);
    }

    if (priority) {
      conditions.push("t.priority = ?");
      values.push(priority);
    }

    if (creatorUserId !== undefined) {
      if (creatorUserId === null) {
        conditions.push("t.creator_user_id IS NULL");
      } else {
        conditions.push("t.creator_user_id = ?");
        values.push(creatorUserId);
      }
    }

    if (assigneeUserId !== undefined) {
      if (assigneeUserId === null) {
        conditions.push("t.assignee_user_id IS NULL");
      } else {
        conditions.push("t.assignee_user_id = ?");
        values.push(assigneeUserId);
      }
    }

    if (dueAfter) {
      conditions.push("t.due_at IS NOT NULL AND t.due_at >= ?");
      values.push(dueAfter);
    }

    if (dueBefore) {
      conditions.push("t.due_at IS NOT NULL AND t.due_at <= ?");
      values.push(dueBefore);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM tasks t ${whereClause}`).get(...values) as {
        total: number;
      }
    ).total;

    const rows = db
      .prepare(
        `${taskSelectSql}
         ${whereClause}
         ${ADMIN_TASK_ORDER_BY}
         LIMIT ?
         OFFSET ?`
      )
      .all(...values, limit, offset) as TaskRow[];

    res.json({
      tasks: rows.map(normalizeTaskRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 1 : Math.ceil(total / limit)
      }
    });
  });

  router.get("/tasks/:id", (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const task = fetchTaskById(db, taskId);
    if (!task || task.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    res.json({
      task: normalizeTaskRow(task),
      events: listTaskEvents(db, task.id)
    });
  });

  router.post("/tasks", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const title = validateTaskTitle(req.body?.title);
    const description = validateTaskDescription(req.body?.description);
    const priority = parseTaskPriority(req.body?.priority) ?? "normal";
    const dueAtInput = parseOptionalDueAt(req.body?.due_at ?? req.body?.dueAt);
    const repeatTypeRaw = req.body?.repeat_type ?? req.body?.repeatType;
    const repeatType = repeatTypeRaw === undefined ? "none" : parseTaskRepeatType(repeatTypeRaw);
    const repeatWeekdaysInput = parseTaskWeekdays(req.body?.weekdays);
    const repeatWeekdays = repeatType === "weekly" ? repeatWeekdaysInput : [];
    const assigneeUserId = parseOptionalUserId(
      req.body?.assignee_user_id ?? req.body?.assigneeUserId
    );

    if (!title) {
      res.status(400).json({ error: "title e obrigatorio e deve ter ate 200 caracteres" });
      return;
    }

    if (dueAtInput.error) {
      res.status(400).json({ error: dueAtInput.error });
      return;
    }

    if (!repeatType) {
      res.status(400).json({ error: "repeat_type invalido" });
      return;
    }

    const recurrenceError = validateTaskRecurrence(repeatType, repeatWeekdays);
    if (recurrenceError) {
      res.status(400).json({ error: recurrenceError });
      return;
    }

    const normalizedAssignee =
      assigneeUserId === undefined ? null : assigneeUserId;

    if (normalizedAssignee !== null && !activeUserExists(db, normalizedAssignee)) {
      res.status(400).json({ error: "assignee_user_id deve referenciar um usuario ativo" });
      return;
    }

    const timestamp = nowIso();
    let assignmentNotification: ReturnType<typeof createTaskLinkedNotification> = null;
    const taskId = db.transaction(() => {
      const insert = db
        .prepare(
          `
            INSERT INTO tasks (
              title,
              description,
              status,
              priority,
              creator_user_id,
              assignee_user_id,
              due_at,
              repeat_type,
              repeat_weekdays_json,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          title,
          description,
          "new",
          priority,
          req.authUser!.id,
          normalizedAssignee,
          dueAtInput.value,
          repeatType,
          stringifyTaskWeekdays(repeatWeekdays),
          timestamp,
          timestamp
        );

      const createdTaskId = Number(insert.lastInsertRowid);
      logTaskEvent(db, {
        taskId: createdTaskId,
        actorUserId: req.authUser!.id,
        eventType: "created",
        toStatus: "new",
        metadata: {
          priority,
          assigneeUserId: normalizedAssignee,
          dueAt: dueAtInput.value,
          repeatType,
          repeatWeekdays
        },
        createdAt: timestamp
      });
      logTaskAudit(db, {
        actorUserId: req.authUser!.id,
        taskId: createdTaskId,
        eventType: "admin.task.create",
        metadata: {
          priority,
          assigneeUserId: normalizedAssignee,
          dueAt: dueAtInput.value,
          repeatType,
          repeatWeekdays
        }
      });

      if (normalizedAssignee !== null && normalizedAssignee !== req.authUser!.id) {
        assignmentNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: createdTaskId,
          title: `Tarefa atribuida: ${title}`,
          message: buildTaskAssignmentMessage(title, req.authUser!.name, dueAtInput.value),
          priority,
          recipientIds: [normalizedAssignee],
          auditEventType: "task.notification.assignment",
          auditMetadata: {
            trigger: "admin.task.create",
            assigneeUserId: normalizedAssignee
          },
          createdAt: timestamp
        });
      }

      return createdTaskId;
    })();

    if (io && assignmentNotification) {
      dispatchTaskLinkedNotification(io, assignmentNotification);
    }

    const created = fetchTaskById(db, taskId);
    res.status(201).json({ task: normalizeTaskRow(created as TaskRow) });
  });

  router.patch("/tasks/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }
    const existingTask = normalizeTaskRow(existing as TaskRow);

    if (isTaskTerminal(existing.status)) {
      res.status(409).json({ error: "Tarefa concluida ou cancelada nao pode ser editada" });
      return;
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];
    const metadata: Record<string, unknown> = {};

    const titleRaw = req.body?.title;
    if (titleRaw !== undefined) {
      const title = validateTaskTitle(titleRaw);
      if (!title) {
        res.status(400).json({ error: "title deve ter entre 1 e 200 caracteres" });
        return;
      }

      updates.push("title = ?");
      values.push(title);
      metadata.title = title;
    }

    if (req.body?.description !== undefined) {
      const description = validateTaskDescription(req.body?.description);
      updates.push("description = ?");
      values.push(description);
      metadata.description = description;
    }

    if (req.body?.priority !== undefined) {
      const priority = parseTaskPriority(req.body?.priority);
      if (!priority) {
        res.status(400).json({ error: "priority invalida" });
        return;
      }

      updates.push("priority = ?");
      values.push(priority);
      metadata.priority = priority;
    }

    let nextAssigneeUserId: number | null | undefined;
    if (req.body?.assignee_user_id !== undefined || req.body?.assigneeUserId !== undefined) {
      nextAssigneeUserId = parseOptionalUserId(req.body?.assignee_user_id ?? req.body?.assigneeUserId);
      if (nextAssigneeUserId === undefined) {
        res.status(400).json({ error: "assignee_user_id invalido" });
        return;
      }

      if (nextAssigneeUserId !== null && !activeUserExists(db, nextAssigneeUserId)) {
        res.status(400).json({ error: "assignee_user_id deve referenciar um usuario ativo" });
        return;
      }

      updates.push("assignee_user_id = ?");
      values.push(nextAssigneeUserId);
      metadata.assigneeUserId = nextAssigneeUserId;
    }

    const dueAtInput = parseOptionalDueAt(req.body?.due_at ?? req.body?.dueAt);
    if (dueAtInput.error) {
      res.status(400).json({ error: dueAtInput.error });
      return;
    }

    if (dueAtInput.provided) {
      updates.push("due_at = ?");
      values.push(dueAtInput.value);
      metadata.dueAt = dueAtInput.value;
    }

    const recurrenceTypeRaw = req.body?.repeat_type ?? req.body?.repeatType;
    const recurrenceProvided = recurrenceTypeRaw !== undefined || req.body?.weekdays !== undefined;
    let nextRepeatType = existingTask.repeatType;
    let nextRepeatWeekdays = existingTask.repeatWeekdays;

    if (recurrenceTypeRaw !== undefined) {
      const parsedRepeatType = parseTaskRepeatType(recurrenceTypeRaw);
      if (!parsedRepeatType) {
        res.status(400).json({ error: "repeat_type invalido" });
        return;
      }

      nextRepeatType = parsedRepeatType;
    }

    if (req.body?.weekdays !== undefined) {
      nextRepeatWeekdays = parseTaskWeekdays(req.body?.weekdays);
    }

    if (nextRepeatType !== "weekly") {
      nextRepeatWeekdays = [];
    }

    const recurrenceError = validateTaskRecurrence(nextRepeatType, nextRepeatWeekdays);
    if (recurrenceProvided && recurrenceError) {
      res.status(400).json({ error: recurrenceError });
      return;
    }

    if (recurrenceProvided) {
      if (nextRepeatType !== existingTask.repeatType) {
        updates.push("repeat_type = ?");
        values.push(nextRepeatType);
      }

      if (JSON.stringify(nextRepeatWeekdays) !== JSON.stringify(existingTask.repeatWeekdays)) {
        updates.push("repeat_weekdays_json = ?");
        values.push(stringifyTaskWeekdays(nextRepeatWeekdays));
      }

      metadata.repeatType = nextRepeatType;
      metadata.repeatWeekdays = nextRepeatWeekdays;
    }

    let nextStatus: TaskStatus | null = null;
    if (req.body?.status !== undefined) {
      nextStatus = parseNonTerminalTaskStatus(req.body?.status);
      if (!nextStatus) {
        res.status(400).json({ error: "status invalido para PATCH. Use: new, in_progress, waiting" });
        return;
      }

      updates.push("status = ?");
      values.push(nextStatus);
      metadata.status = nextStatus;

      if (nextStatus === "in_progress" && !existing.startedAt) {
        updates.push("started_at = ?");
        values.push(nowIso());
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "Nenhum campo valido para atualizar" });
      return;
    }

    const timestamp = nowIso();
    updates.push("updated_at = ?");
    values.push(timestamp);
    values.push(taskId);

    let assignmentNotification: ReturnType<typeof createTaskLinkedNotification> = null;
    let statusNotification: ReturnType<typeof createTaskLinkedNotification> = null;

    db.transaction(() => {
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

      if (nextStatus && nextStatus !== existing.status) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "status_changed",
          fromStatus: existing.status,
          toStatus: nextStatus,
          metadata: { changedBy: "admin.patch" },
          createdAt: timestamp
        });
      }

      if (
        (req.body?.assignee_user_id !== undefined || req.body?.assigneeUserId !== undefined) &&
        nextAssigneeUserId !== existing.assigneeUserId
      ) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "assigned",
          metadata: {
            previousAssigneeUserId: existing.assigneeUserId,
            nextAssigneeUserId
          },
          createdAt: timestamp
        });
      }

      if (dueAtInput.provided && dueAtInput.value !== existing.dueAt) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "due_date_changed",
          metadata: {
            previousDueAt: existing.dueAt,
            nextDueAt: dueAtInput.value
          },
          createdAt: timestamp
        });
      }

      if (
        recurrenceProvided &&
        (nextRepeatType !== existingTask.repeatType ||
          JSON.stringify(nextRepeatWeekdays) !== JSON.stringify(existingTask.repeatWeekdays))
      ) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "recurrence_changed",
          metadata: {
            previousRepeatType: existingTask.repeatType,
            nextRepeatType,
            previousRepeatWeekdays: existingTask.repeatWeekdays,
            nextRepeatWeekdays
          },
          createdAt: timestamp
        });
      }

      logTaskEvent(db, {
        taskId,
        actorUserId: req.authUser!.id,
        eventType: "updated",
        metadata,
        createdAt: timestamp
      });
      logTaskAudit(db, {
        actorUserId: req.authUser!.id,
        taskId,
        eventType: "admin.task.update",
        metadata
      });

      if (
        nextAssigneeUserId !== undefined &&
        nextAssigneeUserId !== null &&
        nextAssigneeUserId !== existing.assigneeUserId &&
        nextAssigneeUserId !== req.authUser!.id
      ) {
        assignmentNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: taskId,
          title: `Tarefa atribuida: ${existing.title}`,
          message: buildTaskAssignmentMessage(
            existing.title,
            req.authUser!.name,
            dueAtInput.provided ? dueAtInput.value : existing.dueAt
          ),
          priority: existing.priority,
          recipientIds: [nextAssigneeUserId],
          auditEventType: "task.notification.assignment",
          auditMetadata: {
            trigger: "admin.task.update",
            previousAssigneeUserId: existing.assigneeUserId,
            nextAssigneeUserId
          },
          createdAt: timestamp
        });
      }

      if (nextStatus && nextStatus !== existing.status && (nextStatus === "in_progress" || nextStatus === "waiting")) {
        const effectiveAssigneeUserId =
          nextAssigneeUserId === undefined ? existing.assigneeUserId : nextAssigneeUserId;
        const recipientIds = buildRecipientIds(existing.creatorUserId, effectiveAssigneeUserId).filter(
          (userId) => userId !== req.authUser!.id
        );

        if (recipientIds.length > 0) {
          statusNotification = createTaskLinkedNotification(db, {
            actorUserId: req.authUser!.id,
            sourceTaskId: taskId,
            title: `Atualizacao de tarefa: ${existing.title}`,
            message: buildTaskStatusMessage(existing.title, req.authUser!.name, nextStatus),
            priority: existing.priority,
            recipientIds,
            auditEventType: "task.notification.status_changed",
            auditMetadata: {
              trigger: "admin.task.update",
              fromStatus: existing.status,
              toStatus: nextStatus
            },
            createdAt: timestamp
          });
        }
      }
    })();

    if (io && assignmentNotification) {
      dispatchTaskLinkedNotification(io, assignmentNotification);
    }

    if (io && statusNotification) {
      dispatchTaskLinkedNotification(io, statusNotification);
    }

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    if (existing.status === "done") {
      res.status(409).json({ error: "Tarefa ja concluida" });
      return;
    }

    if (existing.status === "cancelled") {
      res.status(409).json({ error: "Tarefa cancelada nao pode ser concluida" });
      return;
    }

    const timestamp = nowIso();
    let completionNotification: ReturnType<typeof createTaskLinkedNotification> = null;
    db.transaction(() => {
      db.prepare(
        `
          UPDATE tasks
          SET
            status = 'done',
            started_at = COALESCE(started_at, ?),
            completed_at = ?,
            cancelled_at = NULL,
            updated_at = ?
          WHERE id = ?
        `
      ).run(timestamp, timestamp, timestamp, taskId);

      logTaskEvent(db, {
        taskId,
        actorUserId: req.authUser!.id,
        eventType: "completed",
        fromStatus: existing.status,
        toStatus: "done",
        createdAt: timestamp
      });
      logTaskAudit(db, {
        actorUserId: req.authUser!.id,
        taskId,
        eventType: "admin.task.complete",
        metadata: {
          previousStatus: existing.status,
          completedAt: timestamp
        }
      });

      const recipientIds = buildRecipientIds(existing.creatorUserId, existing.assigneeUserId).filter(
        (userId) => userId !== req.authUser!.id
      );

      if (recipientIds.length > 0) {
        completionNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: taskId,
          title: `Atualizacao de tarefa: ${existing.title}`,
          message: buildTaskStatusMessage(existing.title, req.authUser!.name, "done"),
          priority: existing.priority,
          recipientIds,
          auditEventType: "task.notification.status_changed",
          auditMetadata: {
            trigger: "admin.task.complete",
            fromStatus: existing.status,
            toStatus: "done"
          },
          createdAt: timestamp
        });
      }
    })();

    if (io && completionNotification) {
      dispatchTaskLinkedNotification(io, completionNotification);
    }

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/cancel", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    if (existing.status === "cancelled") {
      res.status(409).json({ error: "Tarefa ja cancelada" });
      return;
    }

    if (existing.status === "done") {
      res.status(409).json({ error: "Tarefa concluida nao pode ser cancelada" });
      return;
    }

    const timestamp = nowIso();
    let cancellationNotification: ReturnType<typeof createTaskLinkedNotification> = null;
    db.transaction(() => {
      db.prepare(
        `
          UPDATE tasks
          SET
            status = 'cancelled',
            cancelled_at = ?,
            completed_at = NULL,
            updated_at = ?
          WHERE id = ?
        `
      ).run(timestamp, timestamp, taskId);

      logTaskEvent(db, {
        taskId,
        actorUserId: req.authUser!.id,
        eventType: "cancelled",
        fromStatus: existing.status,
        toStatus: "cancelled",
        createdAt: timestamp
      });
      logTaskAudit(db, {
        actorUserId: req.authUser!.id,
        taskId,
        eventType: "admin.task.cancel",
        metadata: {
          previousStatus: existing.status,
          cancelledAt: timestamp
        }
      });

      const recipientIds = buildRecipientIds(existing.creatorUserId, existing.assigneeUserId).filter(
        (userId) => userId !== req.authUser!.id
      );

      if (recipientIds.length > 0) {
        cancellationNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: taskId,
          title: `Atualizacao de tarefa: ${existing.title}`,
          message: buildTaskStatusMessage(existing.title, req.authUser!.name, "cancelled"),
          priority: existing.priority,
          recipientIds,
          auditEventType: "task.notification.status_changed",
          auditMetadata: {
            trigger: "admin.task.cancel",
            fromStatus: existing.status,
            toStatus: "cancelled"
          },
          createdAt: timestamp
        });
      }
    })();

    if (io && cancellationNotification) {
      dispatchTaskLinkedNotification(io, cancellationNotification);
    }

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  return router;
};
