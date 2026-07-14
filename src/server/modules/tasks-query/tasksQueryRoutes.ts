import { Router, Response, NextFunction } from "express";
import { AppRequest } from "../../auth/authTypes";
import { authenticateRequest } from "../../auth/authenticateRequest";
import { checkPermission } from "../../auth/authorization";
import { requireModuleEnabled } from "../moduleStateService";
import { tasksQueryService } from "./tasksQueryService";
import { AppError } from "../../../shared/errors/appError";

export function registerTasksQueryRoutes(router: Router) {
  // GET /api/modules/tasks-query/tasks
  router.get(
    "/modules/tasks-query/tasks",
    authenticateRequest,
    checkPermission("tasks.read"),
    requireModuleEnabled("tasks-query"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const result = await tasksQueryService.getTasks(req);
        res.json({
          success: true,
          data: result,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/modules/tasks-query/tasks/:id
  router.get(
    "/modules/tasks-query/tasks/:id",
    authenticateRequest,
    checkPermission("tasks.read"),
    requireModuleEnabled("tasks-query"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.");
        }

        const task = await tasksQueryService.getTaskById(taskId, req);
        if (!task) {
          throw new AppError(
            "PERMISSION_DENIED",
            "Công việc không tồn tại hoặc bạn không có quyền truy cập."
          );
        }

        res.json({
          success: true,
          data: task,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/modules/tasks-query/tasks/:id/history
  router.get(
    "/modules/tasks-query/tasks/:id/history",
    authenticateRequest,
    checkPermission("tasks.read"),
    requireModuleEnabled("tasks-query"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const taskId = req.params.id;
        if (!taskId || !taskId.trim()) {
          throw new AppError("VALIDATION_FAILED", "Mã công việc không hợp lệ.");
        }

        // First check if user can access the task
        const task = await tasksQueryService.getTaskById(taskId, req);
        if (!task) {
          throw new AppError(
            "PERMISSION_DENIED",
            "Công việc không tồn tại hoặc bạn không có quyền truy cập."
          );
        }

        // Dynamically import auditService to avoid coupling if not needed
        const { auditService } = await import("../../audit/auditService");
        const history = await auditService.getLogsByTargetId(taskId, 50);

        res.json({
          success: true,
          data: history,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );
}
