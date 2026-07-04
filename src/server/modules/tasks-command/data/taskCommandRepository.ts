import { TaskCommandRepository } from "../contracts/taskCommandTypes";
import { FirestoreTaskCommandRepository } from "./firestoreTaskCommandRepository";
import { InMemoryTaskCommandRepository } from "./inMemoryTaskCommandRepository";
import { logger } from "../../../infrastructure/logging/logger";
import { serverConfig } from "../../../app/serverConfig";
import { AppError } from "../../../../shared/errors/appError";

let activeRepo: TaskCommandRepository | null = null;
let testOverrideRepo: TaskCommandRepository | null = null;

export function getTaskCommandRepository(): TaskCommandRepository {
  if (testOverrideRepo) {
    return testOverrideRepo;
  }

  if (activeRepo) {
    return activeRepo;
  }

  const source = process.env.TASKS_COMMAND_SOURCE?.trim() || undefined;
  const env = serverConfig.nodeEnv;

  if (env === "production") {
    if (source === "in-memory") {
      throw new AppError(
        "CONFIGURATION_ERROR",
        "TASKS_COMMAND_SOURCE=in-memory không được phép trong môi trường production. Vui lòng sử dụng firestore hoặc để trống."
      );
    }
    activeRepo = new FirestoreTaskCommandRepository();
    logger.info("TaskCommandRepository: Kích hoạt FirestoreTaskCommandRepository.");
    return activeRepo;
  }

  if (source === "firestore") {
    activeRepo = new FirestoreTaskCommandRepository();
    logger.info("TaskCommandRepository: Kích hoạt FirestoreTaskCommandRepository skeleton.");
    return activeRepo;
  }

  activeRepo = new InMemoryTaskCommandRepository();
  logger.info("TaskCommandRepository: Kích hoạt InMemoryTaskCommandRepository (mặc định cho test/dev).");
  return activeRepo;
}

export function setTaskCommandRepository(repo: TaskCommandRepository): void {
  testOverrideRepo = repo;
}

export function resetTaskCommandRepository(): void {
  testOverrideRepo = null;
  activeRepo = null;
}
