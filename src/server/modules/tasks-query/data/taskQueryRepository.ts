import { TaskQueryRepository } from "./taskQueryTypes";
import { getFirebaseStatus } from "../../../infrastructure/firebase/firebaseAdmin";
import { FirestoreTaskQueryRepository } from "./firestoreTaskQueryRepository";
import { FixtureTaskQueryRepository } from "./fixtureTaskQueryRepository";
import { logger } from "../../../infrastructure/logging/logger";
import { AppError } from "../../../../shared/errors/appError";
import { serverConfig } from "../../../app/serverConfig";

let activeRepo: TaskQueryRepository | null = null;
let testOverrideRepo: TaskQueryRepository | null = null;

export function getTaskQueryRepository(): TaskQueryRepository {
  if (testOverrideRepo) {
    return testOverrideRepo;
  }

  if (activeRepo) {
    return activeRepo;
  }

  const fbStatus = getFirebaseStatus();
  const collectionName = process.env.TASKS_COLLECTION;
  const isFirebaseReady =
    fbStatus.status === "ready" || fbStatus.status === "initialized";

  const source = process.env.TASKS_QUERY_SOURCE?.trim() || undefined;
  const isProduction = process.env.NODE_ENV === "production" || serverConfig.nodeEnv === "production";

  if (source !== undefined) {
    if (source === "fixture") {
      activeRepo = new FixtureTaskQueryRepository();
      logger.info("TaskQueryRepository: Kích hoạt FixtureTaskQueryRepository theo cấu hình TASKS_QUERY_SOURCE.");
      return activeRepo;
    } else if (source === "firestore") {
      if (!collectionName || !collectionName.trim()) {
        throw new AppError("DEPENDENCY_UNAVAILABLE", "Cấu hình hệ thống thiếu tên collection nguồn (TASKS_COLLECTION).");
      }
      if (!isFirebaseReady) {
        throw new AppError("DEPENDENCY_UNAVAILABLE", "Firebase Admin chưa sẵn sàng.");
      }
      activeRepo = new FirestoreTaskQueryRepository();
      logger.info(
        `TaskQueryRepository: Kích hoạt FirestoreTaskQueryRepository sử dụng collection '${collectionName.trim()}'.`
      );
      return activeRepo;
    } else {
      throw new AppError("VALIDATION_FAILED", "Giá trị TASKS_QUERY_SOURCE không hợp lệ. Chỉ chấp nhận 'firestore' hoặc 'fixture'.");
    }
  }

  // If source is not defined:
  if (isProduction) {
    // In production, default must be firestore
    if (!collectionName || !collectionName.trim()) {
      throw new AppError("DEPENDENCY_UNAVAILABLE", "Môi trường production yêu cầu cấu hình TASKS_COLLECTION.");
    }
    if (!isFirebaseReady) {
      throw new AppError("DEPENDENCY_UNAVAILABLE", "Môi trường production yêu cầu Firebase sẵn sàng.");
    }
    activeRepo = new FirestoreTaskQueryRepository();
    logger.info(
      `TaskQueryRepository: Kích hoạt FirestoreTaskQueryRepository (mặc định production) sử dụng collection '${collectionName.trim()}'.`
    );
    return activeRepo;
  }

  // Outside production (development/test): default must be fixture
  activeRepo = new FixtureTaskQueryRepository();
  logger.info(
    "TaskQueryRepository: Sử dụng FixtureTaskQueryRepository làm dữ liệu công việc mặc định (ngoài production)."
  );

  return activeRepo;
}

export function setTaskQueryRepository(repo: TaskQueryRepository): void {
  testOverrideRepo = repo;
}

export function resetTaskQueryRepository(): void {
  testOverrideRepo = null;
  activeRepo = null;
}

