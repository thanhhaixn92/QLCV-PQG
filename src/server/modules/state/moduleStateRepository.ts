import { serverConfig } from "../../app/serverConfig";
import { getFirebaseStatus } from "../../infrastructure/firebase/firebaseAdmin";
import { ModuleStateRepository, PersistedModuleState, SetModuleStateInput, ModuleStateListResult } from "./moduleStateTypes";
import { InMemoryModuleStateRepository } from "./inMemoryModuleStateRepository";
import { FirestoreModuleStateRepository } from "./firestoreModuleStateRepository";
import { logger } from "../../infrastructure/logging/logger";
import { AppError } from "../../../shared/errors/appError";

export class UnavailableModuleStateRepository implements ModuleStateRepository {
  async get(moduleId: string): Promise<PersistedModuleState | null> {
    throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
  }
  async set(input: SetModuleStateInput): Promise<PersistedModuleState> {
    throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
  }
  async list(): Promise<ModuleStateListResult> {
    throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
  }
}

let activeRepository: ModuleStateRepository | null = null;
let currentMode: "firestore" | "in-memory" | "unavailable" = "unavailable";

export function getModuleStateRepository(): ModuleStateRepository {
  if (activeRepository) {
    return activeRepository;
  }

  const fbStatus = getFirebaseStatus();
  const isProduction = process.env.NODE_ENV === "production";
  
  // Only use Firestore if status is initialized or ready
  const canUseFirestore =
    fbStatus.status === "ready" ||
    fbStatus.status === "initialized";

  if (canUseFirestore && serverConfig.firebaseProjectId) {
    try {
      activeRepository = new FirestoreModuleStateRepository();
      currentMode = "firestore";
      logger.info("ModuleStateRepository: Khởi tạo FirestoreModuleStateRepository làm bộ lưu trữ trạng thái.");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.error(`ModuleStateRepository: Không thể khởi tạo Firestore adapter. Lỗi: ${errMsg}`);
      if (isProduction) {
        currentMode = "unavailable";
        activeRepository = new UnavailableModuleStateRepository();
      } else {
        activeRepository = new InMemoryModuleStateRepository();
        currentMode = "in-memory";
      }
    }
  } else {
    if (isProduction) {
      currentMode = "unavailable";
      activeRepository = new UnavailableModuleStateRepository();
      logger.warn("ModuleStateRepository: Firestore không khả dụng ở chế độ production. Đặt persistenceMode sang 'unavailable'.");
    } else {
      activeRepository = new InMemoryModuleStateRepository();
      currentMode = "in-memory";
      logger.info("ModuleStateRepository: Khởi tạo InMemoryModuleStateRepository làm bộ lưu trữ trạng thái (Môi trường test/development).");
    }
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
