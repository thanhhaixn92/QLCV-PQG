import { TaskCommandRepository } from "../contracts/taskCommandTypes";
import { FirestoreTaskCommandRepository } from "./firestoreTaskCommandRepository";
import { InMemoryTaskCommandRepository } from "./inMemoryTaskCommandRepository";
import { logger } from "../../../infrastructure/logging/logger";

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
  const env = process.env.NODE_ENV;

  if (env === "production") {
    if (source === "in-memory") {
      logger.warn("TaskCommandRepository: Chạy in-memory trong production (chỉ dùng cho mục đích demo/test).");
      activeRepo = new InMemoryTaskCommandRepository();
    } else {
      activeRepo = new FirestoreTaskCommandRepository();
      logger.info("TaskCommandRepository: Kích hoạt FirestoreTaskCommandRepository.");
    }
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
