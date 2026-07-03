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

  const source = process.env.TASKS_QUERY_SOURCE?.trim() || undefined;

  if (source === "firestore") {
    activeRepo = new FirestoreTaskCommandRepository();
    logger.info("TaskCommandRepository: Kích hoạt FirestoreTaskCommandRepository skeleton.");
    return activeRepo;
  }

  activeRepo = new InMemoryTaskCommandRepository();
  logger.info("TaskCommandRepository: Kích hoạt InMemoryTaskCommandRepository fallback.");
  return activeRepo;
}

export function setTaskCommandRepository(repo: TaskCommandRepository): void {
  testOverrideRepo = repo;
}

export function resetTaskCommandRepository(): void {
  testOverrideRepo = null;
  activeRepo = null;
}
