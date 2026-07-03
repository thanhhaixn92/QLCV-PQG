import { Router, Response, NextFunction } from "express";
import { AppRequest } from "../../../auth/authTypes";
import { authenticateRequest } from "../../../auth/authenticateRequest";
import { checkPermission } from "../../../auth/authorization";
import { requireModuleEnabled } from "../../moduleStateService";
import { taskCommandService } from "../services/taskCommandService";
import { AppError } from "../../../../shared/errors/appError";
import { ROLE_PERMISSIONS, UserRole } from "../../../../shared/permissions/permissions";
import { TaskCommandContext } from "../contracts/taskCommandTypes";
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  transitionTaskSchema,
  archiveTaskSchema
} from "../contracts/taskCommandSchemas";

export function registerTaskCommandRoutes(router: Router) {
  function getCommandContext(req: AppRequest): TaskCommandContext {
    const role: UserRole = req.user?.role || "viewer";
    const permissions = ROLE_PERMISSIONS[role] || [];
    return {
      actorUid: req.user?.uid || "unknown",
      actorRole: role,
      permissions: [...permissions],
      departmentIds: req.user?.departmentIds || [],
      requestId: req.requestId || "system-requestId"
    };
  }

  // POST /modules/tasks-command/tasks
  router.post(
    "/modules/tasks-command/tasks",
    authenticateRequest,
    requireModuleEnabled("tasks-command"),
    checkPermission("tasks.create"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const bodyParse = createTaskSchema.safeParse(req.body);
        if (!bodyParse.success) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu không hợp lệ: " + bodyParse.error.message, req.requestId);
        }

        const context = getCommandContext(req);
        const result = await taskCommandService.createTask(bodyParse.data, context);

        res.status(201).json({
          success: true,
          requestId: req.requestId,
          data: { task: result }
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  );

  // PATCH /modules/tasks-command/tasks/:id
  router.patch(
    "/modules/tasks-command/tasks/:id",
    authenticateRequest,
    requireModuleEnabled("tasks-command"),
    checkPermission("tasks.update"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.", req.requestId);
        }

        const bodyParse = updateTaskSchema.safeParse(req.body);
        if (!bodyParse.success) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu không hợp lệ: " + bodyParse.error.message, req.requestId);
        }

        const context = getCommandContext(req);
        const result = await taskCommandService.updateTask(taskId, bodyParse.data, context);

        res.json({
          success: true,
          requestId: req.requestId,
          data: { task: result }
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  );

  // PUT /modules/tasks-command/tasks/:id/assignee
  router.put(
    "/modules/tasks-command/tasks/:id/assignee",
    authenticateRequest,
    requireModuleEnabled("tasks-command"),
    checkPermission("tasks.assign"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.", req.requestId);
        }

        const bodyParse = assignTaskSchema.safeParse(req.body);
        if (!bodyParse.success) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu không hợp lệ: " + bodyParse.error.message, req.requestId);
        }

        const context = getCommandContext(req);
        const result = await taskCommandService.assignTask(taskId, bodyParse.data, context);

        res.json({
          success: true,
          requestId: req.requestId,
          data: { task: result }
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  );

  // POST /modules/tasks-command/tasks/:id/transitions
  router.post(
    "/modules/tasks-command/tasks/:id/transitions",
    authenticateRequest,
    requireModuleEnabled("tasks-command"),
    checkPermission("tasks.transition"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.", req.requestId);
        }

        const bodyParse = transitionTaskSchema.safeParse(req.body);
        if (!bodyParse.success) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu không hợp lệ: " + bodyParse.error.message, req.requestId);
        }

        const context = getCommandContext(req);
        const result = await taskCommandService.transitionTask(taskId, bodyParse.data, context);

        res.json({
          success: true,
          requestId: req.requestId,
          data: { task: result }
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  );

  // DELETE /modules/tasks-command/tasks/:id
  router.delete(
    "/modules/tasks-command/tasks/:id",
    authenticateRequest,
    requireModuleEnabled("tasks-command"),
    checkPermission("tasks.archive"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.", req.requestId);
        }

        const bodyParse = archiveTaskSchema.safeParse(req.body);
        if (!bodyParse.success) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu không hợp lệ: " + bodyParse.error.message, req.requestId);
        }

        const context = getCommandContext(req);
        await taskCommandService.archiveTask(taskId, bodyParse.data.expectedVersion, context);

        res.json({
          success: true,
          requestId: req.requestId
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  );
}
