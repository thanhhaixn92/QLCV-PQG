import { Router, Response, NextFunction } from "express";
import { AppRequest } from "../../auth/authTypes";
import { authenticateRequest } from "../../auth/authenticateRequest";
import { checkPermission } from "../../auth/authorization";
import { requireModuleEnabled } from "../moduleStateService";
import { tasksQueryServiceMock } from "./tasksQueryService.mock";

export function registerTasksQueryRoutes(router: Router) {
  router.get(
    "/modules/tasks-query/tasks",
    authenticateRequest,
    checkPermission("tasks.read"),
    requireModuleEnabled("tasks-query"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const tasks = await tasksQueryServiceMock.getTasks(req);
        res.json({
          success: true,
          tasks,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );
}
