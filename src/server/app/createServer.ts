import express, { Router, Response, NextFunction } from "express";
import { validateConfig } from "./serverConfig";
import { registerCoreRoutes } from "./registerCoreRoutes";
import { registerAllModules } from "../modules/registerModules";
import { moduleRegistry } from "../modules/moduleRegistry";
import { moduleStateService } from "../modules/moduleStateService";
import { migrationService } from "../modules/migrationService";
import { AppError } from "../../shared/errors/appError";
import { logger } from "../infrastructure/logging/logger";
import { requestInitializer } from "../auth/authenticateRequest";
import { AppRequest } from "../auth/authTypes";

export async function createServer() {
  validateConfig();
  registerAllModules();
  await moduleStateService.hydrateFromRepository();
  await migrationService.runMigrations("system-bootstrap");

  // Khởi động tiến trình quét cảnh báo công việc quá hạn/sắp đến hạn tự động (Background Scheduler)
  setTimeout(async () => {
    try {
      const { notificationService } = await import("../modules/notifications/services/notificationService");
      await notificationService.scanAndNotifyOverdueTasks("system-bootstrap-scan");

      // Cài đặt tần suất quét định kỳ (Mỗi 1 giờ quét hệ thống một lần)
      setInterval(async () => {
        try {
          await notificationService.scanAndNotifyOverdueTasks("system-cron-hourly");
        } catch (cronErr: any) {
          logger.error(`[Background Cron] Lỗi khi chạy quét tác vụ định kỳ: ${cronErr.message}`);
        }
      }, 60 * 60 * 1000);

    } catch (cronInitErr: any) {
      logger.warn(`[Background Cron] Trạng thái khởi tạo tác vụ quét tự động: ${cronInitErr.message}`);
    }
  }, 5000);

  const app = express();
  
  // Register global correlation ID middleware first
  app.use(requestInitializer);
  app.use(express.json());

  const apiRouter = Router();
  registerCoreRoutes(apiRouter);

  // Register module-specific routes dynamically
  const registeredModules = moduleRegistry.getAllModules();
  for (const mod of registeredModules) {
    if (mod.registerRoutes) {
      mod.registerRoutes(apiRouter);
    }
  }

  app.use("/api", apiRouter);

  app.use((err: unknown, req: AppRequest, res: Response, next: NextFunction) => {
    const requestId = req.requestId || "unknown";
    
    if (err instanceof AppError) {
      logger.warn(`AppError [${err.code}]: ${err.message}`, { requestId, code: err.code });
      const json = err.toJSON();
      if (!json.error.requestId) {
        json.error.requestId = requestId;
      }
      res.status(err.getStatusCode()).json(json);
      return;
    }

    const isError = err instanceof Error;
    logger.error("Internal Server Error Unhandled", isError ? err : new Error(String(err)), { requestId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Hệ thống gặp lỗi nội bộ không mong muốn.",
        requestId
      }
    });
  });

  return app;
}
