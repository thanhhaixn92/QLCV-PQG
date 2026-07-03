import { Router, Response, NextFunction } from "express";
import { healthRoute } from "../routes/healthRoute";
import { aiHealthRoute } from "../routes/aiHealthRoute";
import { firebaseHealthRoute } from "../routes/firebaseHealthRoute";
import { runtimeConfigRoute } from "../runtime/runtimeConfigRoute";
import { authenticateRequest } from "../auth/authenticateRequest";
import { checkPermission } from "../auth/authorization";
import { moduleRegistry } from "../modules/moduleRegistry";
import { moduleStateService } from "../modules/moduleStateService";
import { getModuleStateRepository, getRepositoryPersistenceMode } from "../modules/state/moduleStateRepository";
import { auditService } from "../audit/auditService";
import { AppRequest } from "../auth/authTypes";
import { AppError } from "../../shared/errors/appError";
import { z } from "zod";

export function registerCoreRoutes(router: Router) {
  // Public access routes
  router.get("/health", healthRoute);
  router.get("/ai/health", aiHealthRoute);
  router.get("/firebase/health", firebaseHealthRoute);
  router.get("/runtime-config", runtimeConfigRoute);

  // Protected administration routes
  router.get(
    "/admin/modules/states",
    authenticateRequest,
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const repo = getModuleStateRepository();
        const persistedStates = await repo.list();
        const registered = moduleRegistry.getAllModules();
        
        const data = registered.map((mod) => {
          const persisted = persistedStates.find((ps) => ps.moduleId === mod.manifest.id);
          return {
            moduleId: mod.manifest.id,
            state: mod.state,
            displayName: mod.manifest.displayName,
            description: mod.manifest.description,
            persisted: persisted ? {
              version: persisted.version,
              updatedAt: persisted.updatedAt.toISOString(),
              updatedBy: persisted.updatedBy,
              reason: persisted.reason
            } : null
          };
        });

        res.json({
          data,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.put(
    "/admin/modules/:id/state",
    authenticateRequest,
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const bodySchema = z.object({
          state: z.enum(["enabled", "disabled", "degraded"]),
          reason: z.string().max(500).optional(),
          expectedVersion: z.number().int().min(0).optional()
        });

        const parseResult = bodySchema.safeParse(req.body);
        if (!parseResult.success) {
          throw new AppError(
            "VALIDATION_FAILED",
            "Trạng thái mô-đun truyền vào không hợp lệ hoặc lý do quá dài.",
            req.requestId,
            parseResult.error.format()
          );
        }

        const { state, reason, expectedVersion } = parseResult.data;
        const updatedBy = req.user?.uid || "system";

        // Get fromState before the transaction/set operation
        const fromState = moduleStateService.getModuleState(id);

        const record = await moduleStateService.setModuleState({
          moduleId: id,
          state,
          updatedBy,
          reason,
          expectedVersion
        });

        auditService.logEvent({
          actor: {
            type: "user",
            id: req.user?.uid || "system"
          },
          action: "module.state.changed",
          moduleId: id,
          requestId: req.requestId || "",
          result: "success",
          metadata: {
            moduleId: id,
            fromState,
            toState: state,
            actorUid: req.user?.uid || "system",
            version: record.version,
            persistenceMode: getRepositoryPersistenceMode()
          }
        });

        res.json({
          data: {
            moduleId: record.moduleId,
            state: record.state,
            version: record.version,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy,
            reason: record.reason,
            persistenceMode: getRepositoryPersistenceMode()
          },
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Module state health check endpoint
  router.get(
    "/module-state/health",
    (req: AppRequest, res: Response) => {
      const health = moduleStateService.getPersistenceStatus();
      res.json({
        ...health,
        requestId: req.requestId
      });
    }
  );
}
