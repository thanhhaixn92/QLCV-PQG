import { serverConfig } from "../../app/serverConfig";
import { getFirebaseStatus } from "../../infrastructure/firebase/firebaseAdmin";
import { ModuleStateRepository } from "./moduleStateTypes";
import { InMemoryModuleStateRepository } from "./inMemoryModuleStateRepository";
import { FirestoreModuleStateRepository } from "./firestoreModuleStateRepository";
import { logger } from "../../infrastructure/logging/logger";

let activeRepository: ModuleStateRepository | null = null;
let currentMode: "firestore" | "in-memory" | "unavailable" = "unavailable";

export function getModuleStateRepository(): ModuleStateRepository {
  if (activeRepository) {
    return activeRepository;
  }

  const fbStatus = getFirebaseStatus();
  
  // Decide database mode: Firestore can be used if Admin is fully ready, initialized, or configured (during server startup)
  const canUseFirestore =
    fbStatus.status === "ready" ||
    fbStatus.status === "initialized" ||
    fbStatus.status === "configured";

  // Force in-memory for testing if ALLOW_MOCK_AUTH is active and credentials are missing, or we explicitly fallback
  if (canUseFirestore && serverConfig.firebaseProjectId) {
    try {
      activeRepository = new FirestoreModuleStateRepository();
      currentMode = "firestore";
      logger.info("ModuleStateRepository: Khởi tạo FirestoreModuleStateRepository làm bộ lưu trữ trạng thái.");
    } catch (e: any) {
      logger.error(`ModuleStateRepository: Không thể khởi tạo Firestore adapter, rơi về In-Memory. Lỗi: ${e.message}`);
      activeRepository = new InMemoryModuleStateRepository();
      currentMode = "in-memory";
    }
  } else {
    activeRepository = new InMemoryModuleStateRepository();
    currentMode = "in-memory";
    logger.info("ModuleStateRepository: Khởi tạo InMemoryModuleStateRepository làm bộ lưu trữ trạng thái (Môi trường test/development).");
  }

  return activeRepository;
}

export function setModuleStateRepository(repo: ModuleStateRepository | null, mode: "firestore" | "in-memory" | "unavailable" = "in-memory") {
  activeRepository = repo;
  currentMode = repo ? mode : "unavailable";
  logger.info(`ModuleStateRepository: Đặt thủ công repository sang chế độ '${currentMode}'`);
}

export function getRepositoryPersistenceMode(): "firestore" | "in-memory" | "unavailable" {
  // Ensure initialized
  getModuleStateRepository();
  return currentMode;
}

export function resetRepositoryMode() {
  activeRepository = null;
  currentMode = "unavailable";
}
