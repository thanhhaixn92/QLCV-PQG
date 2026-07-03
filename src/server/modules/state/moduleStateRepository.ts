import { serverConfig } from "../../app/serverConfig";
import { getFirebaseStatus } from "../../infrastructure/firebase/firebaseAdmin";
import { ModuleStateRepository } from "./moduleStateTypes";
import { InMemoryModuleStateRepository } from "./inMemoryModuleStateRepository";
import { FirestoreModuleStateRepository } from "./firestoreModuleStateRepository";
import { logger } from "../../infrastructure/logging/logger";
import { AppError } from "../../../shared/errors/appError";

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
    } catch (e: any) {
      logger.error(`ModuleStateRepository: Không thể khởi tạo Firestore adapter. Lỗi: ${e.message}`);
      if (isProduction) {
        currentMode = "unavailable";
        activeRepository = {
          async get() {
            throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
          },
          async set() {
            throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
          },
          async list() {
            throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
          }
        };
      } else {
        activeRepository = new InMemoryModuleStateRepository();
        currentMode = "in-memory";
      }
    }
  } else {
    if (isProduction) {
      currentMode = "unavailable";
      activeRepository = {
        async get() {
          throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
        },
        async set() {
          throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
        },
        async list() {
          throw new AppError("DEPENDENCY_UNAVAILABLE", "Hệ thống lưu trữ trạng thái không khả dụng ở chế độ production.");
        }
      };
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
