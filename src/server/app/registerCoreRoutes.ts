import { Router, Response, NextFunction } from "express";
import { healthRoute } from "../routes/healthRoute";
import { aiHealthRoute } from "../routes/aiHealthRoute";
import { runtimeConfigRoute } from "../runtime/runtimeConfigRoute";
import { authenticateRequest, requestInitializer } from "../auth/authenticateRequest";
import { checkPermission } from "../auth/authorization";
import { moduleRegistry } from "../modules/moduleRegistry";
import { moduleStateService } from "../modules/moduleStateService";
import { auditService } from "../audit/auditService";
import { AppRequest } from "../auth/authTypes";
import { AppError } from "../../shared/errors/appError";
import { z } from "zod";

export function registerCoreRoutes(router: Router) {
  // Initialize request variables (requestId)
  router.use(requestInitializer);

  // Public access routes
  router.get("/health", healthRoute);
  router.get("/ai/health", aiHealthRoute);
  router.get("/runtime-config", runtimeConfigRoute);

  // Protected administration routes
  router.post(
    "/admin/modules/:id/state",
    authenticateRequest,
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const bodySchema = z.object({
          state: z.enum(["enabled", "disabled", "degraded", "unavailable"])
        });

        const parseResult = bodySchema.safeParse(req.body);
        if (!parseResult.success) {
          throw new AppError(
            "VALIDATION_FAILED",
            "Trạng thái mô-đun truyền vào không hợp lệ.",
            req.requestId,
            parseResult.error.format()
          );
        }

        const { state } = parseResult.data;
        const success = moduleRegistry.updateModuleState(id, state);

        if (!success) {
          throw new AppError("MODULE_UNAVAILABLE", `Không tìm thấy mô-đun mang ID '${id}' để cập nhật.`, req.requestId);
        }

        auditService.logEvent({
          actor: {
            type: "user",
            id: req.user?.uid
          },
          action: `Cập nhật trạng thái mô-đun sang: ${state.toUpperCase()}`,
          moduleId: id,
          requestId: req.requestId || "",
          result: "success"
        });

        res.json({
          success: true,
          moduleId: id,
          state,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // tasks-query API boundary mock
  router.get(
    "/modules/tasks-query/tasks",
    authenticateRequest,
    checkPermission("tasks.read"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        // Enforce that module must be enabled at backend level
        moduleStateService.assertModuleEnabled("tasks-query", req.requestId);

        res.json({
          success: true,
          tasks: [
            { id: "CV-001", title: "Xây dựng khung ứng dụng QLCV_PQG Next v3.0", status: "completed", assignee: "Principal Architect" },
            { id: "CV-002", title: "Thiết lập module-state-registry điều khiển luồng", status: "completed", assignee: "Senior Dev" },
            { id: "CV-003", title: "Tích hợp và kiểm toán API Edge với Zod", status: "pending", assignee: "Security Lead" }
          ],
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );
}
