import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import { createTaskLinkedNotification, dispatchTaskLinkedNotification } from "../tasks/notifications";
import {
  fetchTaskForUser,
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

const USER_TASK_ORDER_BY = `
  ORDER BY
    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END ASC,
    t.due_at ASC,
    t.created_at DESC,
    t.id DESC
`;

export const createTaskMeRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskMeRouterWithIo(db, null, config);
};

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

export const createTaskMeRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/tasks", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const limit = parseLimit(req.query.limit, 50, 200);
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

    if (
      assigneeUserId !== undefined &&
      assigneeUserId !== null &&
      assigneeUserId !== req.authUser.id
    ) {
      res.status(400).json({ error: "assignee_user_id invalido para o escopo do usuario" });
      return;
    }

    if (
      creatorUserId !== undefined &&
      creatorUserId !== null &&
      creatorUserId !== req.authUser.id
    ) {
      res.status(400).json({ error: "creator_user_id invalido para o escopo do usuario" });
      return;
    }

    const conditions = ["(t.creator_user_id = ? OR t.assignee_user_id = ?)"];
    const values: Array<string | number> = [req.authUser.id, req.authUser.id];

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

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM tasks t ${whereClause}`).get(...values) as {
        total: number;
      }
    ).total;

    const rows = db
      .prepare(
        `${taskSelectSql}
         ${whereClause}
         ${USER_TASK_ORDER_BY}
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
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const task = fetchTaskForUser(db, taskId, req.authUser.id);
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
    const normalizedAssigneeUserId =
      assigneeUserId === undefined ? null : assigneeUserId;

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

    if (normalizedAssigneeUserId !== null && normalizedAssigneeUserId !== req.authUser.id) {
      res.status(400).json({ error: "Usuario comum so pode atribuir tarefa a si mesmo" });
      return;
    }

    const timestamp = nowIso();
    let assignmentNotification: ReturnType<typeof createTaskLinkedNotification> = null;
    const result = db.transaction(() => {
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
          normalizedAssigneeUserId,
          dueAtInput.value,
          repeatType,
          stringifyTaskWeekdays(repeatWeekdays),
          timestamp,
          timestamp
        );

      const taskId = Number(insert.lastInsertRowid);
      logTaskEvent(db, {
        taskId,
        actorUserId: req.authUser!.id,
        eventType: "created",
        toStatus: "new",
        metadata: {
          priority,
          assigneeUserId: normalizedAssigneeUserId,
          dueAt: dueAtInput.value,
          repeatType,
          repeatWeekdays
        },
        createdAt: timestamp
      });
      logTaskAudit(db, {
        actorUserId: req.authUser!.id,
        taskId,
        eventType: "task.create",
        metadata: {
          priority,
          assigneeUserId: normalizedAssigneeUserId,
          dueAt: dueAtInput.value,
          repeatType,
          repeatWeekdays
        }
      });

      if (normalizedAssigneeUserId !== null && normalizedAssigneeUserId !== req.authUser!.id) {
        assignmentNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: taskId,
          title: `Tarefa atribuida: ${title}`,
          message: buildTaskAssignmentMessage(title, req.authUser!.name, dueAtInput.value),
          priority,
          recipientIds: [normalizedAssigneeUserId],
          auditEventType: "task.notification.assignment",
          auditMetadata: {
            trigger: "task.create",
            assigneeUserId: normalizedAssigneeUserId
          },
          createdAt: timestamp
        });
      }

      return taskId;
    })();

    if (io && assignmentNotification) {
      dispatchTaskLinkedNotification(io, assignmentNotification);
    }

    const created = fetchTaskForUser(db, result, req.authUser.id);
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

    const existing = fetchTaskForUser(db, taskId, req.authUser.id);
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

    const priorityValue = req.body?.priority;
    if (priorityValue !== undefined) {
      const priority = parseTaskPriority(priorityValue);
      if (!priority) {
        res.status(400).json({ error: "priority invalida" });
        return;
      }

      updates.push("priority = ?");
      values.push(priority);
      metadata.priority = priority;
    }

    const assigneeInput =
      req.body?.assignee_user_id !== undefined || req.body?.assigneeUserId !== undefined
        ? parseOptionalUserId(req.body?.assignee_user_id ?? req.body?.assigneeUserId)
        : undefined;
    if (
      req.body?.assignee_user_id !== undefined ||
      req.body?.assigneeUserId !== undefined
    ) {
      if (assigneeInput === undefined) {
        res.status(400).json({ error: "assignee_user_id invalido" });
        return;
      }

      if (assigneeInput !== null && assigneeInput !== req.authUser.id) {
        res.status(400).json({ error: "Usuario comum so pode atribuir tarefa a si mesmo" });
        return;
      }

      updates.push("assignee_user_id = ?");
      values.push(assigneeInput);
      metadata.assigneeUserId = assigneeInput;
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

    const statusRaw = req.body?.status;
    let nextStatus: TaskStatus | null = null;
    if (statusRaw !== undefined) {
      nextStatus = parseNonTerminalTaskStatus(statusRaw);
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

      if (statusRaw !== undefined && nextStatus && nextStatus !== existing.status) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "status_changed",
          fromStatus: existing.status,
          toStatus: nextStatus,
          metadata: { changedBy: "user.patch" },
          createdAt: timestamp
        });
      }

      if (
        (req.body?.assignee_user_id !== undefined || req.body?.assigneeUserId !== undefined) &&
        assigneeInput !== existing.assigneeUserId
      ) {
        logTaskEvent(db, {
          taskId,
          actorUserId: req.authUser!.id,
          eventType: "assigned",
          metadata: {
            previousAssigneeUserId: existing.assigneeUserId,
            nextAssigneeUserId: assigneeInput
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
        eventType: "task.update",
        metadata
      });

      if (
        assigneeInput !== undefined &&
        assigneeInput !== null &&
        assigneeInput !== existing.assigneeUserId &&
        assigneeInput !== req.authUser!.id
      ) {
        assignmentNotification = createTaskLinkedNotification(db, {
          actorUserId: req.authUser!.id,
          sourceTaskId: taskId,
          title: `Tarefa atribuida: ${existing.title}`,
          message: buildTaskAssignmentMessage(existing.title, req.authUser!.name, dueAtInput.provided ? dueAtInput.value : existing.dueAt),
          priority: existing.priority,
          recipientIds: [assigneeInput],
          auditEventType: "task.notification.assignment",
          auditMetadata: {
            trigger: "task.update",
            previousAssigneeUserId: existing.assigneeUserId,
            nextAssigneeUserId: assigneeInput
          },
          createdAt: timestamp
        });
      }

      if (nextStatus && nextStatus !== existing.status && (nextStatus === "in_progress" || nextStatus === "waiting")) {
        const effectiveAssigneeUserId = assigneeInput === undefined ? existing.assigneeUserId : assigneeInput;
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
              trigger: "task.update",
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

    const updated = fetchTaskForUser(db, taskId, req.authUser.id);
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

    const existing = fetchTaskForUser(db, taskId, req.authUser.id);
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
        eventType: "task.complete",
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
            trigger: "task.complete",
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

    const updated = fetchTaskForUser(db, taskId, req.authUser.id);
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

    const existing = fetchTaskForUser(db, taskId, req.authUser.id);
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
        eventType: "task.cancel",
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
            trigger: "task.cancel",
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

    const updated = fetchTaskForUser(db, taskId, req.authUser.id);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  return router;
};
