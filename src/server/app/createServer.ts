import express, { Router, Request, Response, NextFunction } from "express";
import { validateConfig } from "./serverConfig";
import { registerCoreRoutes } from "./registerCoreRoutes";
import { registerAllModules } from "../modules/registerModules";
import { AppError } from "../../shared/errors/appError";
import { logger } from "../infrastructure/logging/logger";

export async function createServer() {
  validateConfig();
  registerAllModules();

  const app = express();
  app.use(express.json());

  const apiRouter = Router();
  registerCoreRoutes(apiRouter);
  app.use("/api", apiRouter);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || "unknown";
    
    if (err instanceof AppError) {
      logger.warn(`AppError [${err.code}]: ${err.message}`, { requestId, code: err.code });
      res.status(400).json(err.toJSON());
      return;
    }

    logger.error("Internal Server Error Unhandled", err, { requestId });
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
