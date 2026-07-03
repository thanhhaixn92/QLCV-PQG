import { TaskQueryRepository } from "./taskQueryTypes";
import { getFirebaseStatus } from "../../../infrastructure/firebase/firebaseAdmin";
import { FirestoreTaskQueryRepository } from "./firestoreTaskQueryRepository";
import { FixtureTaskQueryRepository } from "./fixtureTaskQueryRepository";
import { logger } from "../../../infrastructure/logging/logger";

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

  if (isFirebaseReady && collectionName && collectionName.trim()) {
    try {
      activeRepo = new FirestoreTaskQueryRepository();
      logger.info(
        `TaskQueryRepository: Kích hoạt FirestoreTaskQueryRepository sử dụng collection '${collectionName.trim()}'.`
      );
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.error(
        `TaskQueryRepository: Lỗi khởi tạo Firestore adapter, sử dụng Fixture fallback. Chi tiết: ${errMsg}`
      );
      activeRepo = new FixtureTaskQueryRepository();
    }
  } else {
    activeRepo = new FixtureTaskQueryRepository();
    logger.info(
      "TaskQueryRepository: Sử dụng FixtureTaskQueryRepository làm dữ liệu công việc mặc định."
    );
  }

  return activeRepo;
}

export function setTaskQueryRepository(repo: TaskQueryRepository): void {
  testOverrideRepo = repo;
}

export function resetTaskQueryRepository(): void {
  testOverrideRepo = null;
  activeRepo = null;
}
