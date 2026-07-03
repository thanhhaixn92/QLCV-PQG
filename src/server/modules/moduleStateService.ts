import { moduleRegistry } from "./moduleRegistry";
import { AppError } from "../../shared/errors/appError";
import { ModuleState } from "../../shared/contracts/moduleContracts";
import { Response, NextFunction } from "express";
import { AppRequest } from "../auth/authTypes";
import { getModuleStateRepository, getRepositoryPersistenceMode } from "./state/moduleStateRepository";
import { PersistedModuleState, ModuleStatePersistenceStatus } from "./state/moduleStateTypes";
import { logger } from "../infrastructure/logging/logger";

let hydrated = false;
let lastHydratedAt: Date | null = null;
let persistenceStatus: "ready" | "degraded" | "unavailable" = "ready";

export const moduleStateService = {
  getModuleState(moduleId: string): ModuleState {
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) return "unavailable";
    return mod.state;
  },

  isModuleEnabled(moduleId: string): boolean {
    return this.getModuleState(moduleId) === "enabled";
  },

  assertModuleEnabled(moduleId: string, requestId?: string) {
    const state = this.getModuleState(moduleId);
    if (state === "disabled") {
      throw new AppError("MODULE_DISABLED", `Mô-đun '${moduleId}' hiện đang bị vô hiệu hóa từ máy chủ.`, requestId);
    }
    if (state === "unavailable") {
      throw new AppError("MODULE_UNAVAILABLE", `Mô-đun '${moduleId}' không tồn tại hoặc không khả dụng.`, requestId);
    }
    if (state === "degraded") {
      throw new AppError("DEPENDENCY_UNAVAILABLE", `Mô-đun '${moduleId}' đang hoạt động ở chế độ suy giảm (Degraded).`, requestId);
    }
  },

  getPersistenceStatus(): ModuleStatePersistenceStatus {
    const mode = getRepositoryPersistenceMode();
    let status: "ready" | "degraded" | "unavailable" = "ready";
    if (mode === "unavailable") {
      status = "unavailable";
    } else if (!hydrated || persistenceStatus === "degraded") {
      status = "degraded";
    }
    return {
      status,
      persistenceMode: mode,
      hydrated,
      lastHydratedAt: lastHydratedAt ? lastHydratedAt.toISOString() : null,
    };
  },

  resetHydrationState() {
    hydrated = false;
    lastHydratedAt = null;
    persistenceStatus = "ready";
  },

  async hydrateFromRepository(): Promise<{ success: boolean; mode: string; count: number; invalidRecordCount?: number; error?: string }> {
    const mode = getRepositoryPersistenceMode();
    try {
      const repo = getModuleStateRepository();
      const records = await repo.list();
      let count = 0;

      for (const record of records) {
        const mod = moduleRegistry.getModule(record.moduleId);
        if (mod) {
          moduleRegistry.updateModuleState(record.moduleId, record.state);
          count++;
        } else {
          logger.warn(`ModuleStateService: Bỏ qua persisted state của mô-đun không tồn tại '${record.moduleId}'.`);
        }
      }

      const invalidCount = (records as any).invalidCount || 0;
      if (invalidCount > 0) {
        hydrated = true;
        lastHydratedAt = new Date();
        persistenceStatus = "degraded";
        return { success: true, mode, count, invalidRecordCount: invalidCount };
      }

      hydrated = true;
      lastHydratedAt = new Date();
      persistenceStatus = "ready";
      return { success: true, mode, count };
    } catch (error: any) {
      logger.error(`ModuleStateService: Hydration thất bại: ${error.message}`);
      hydrated = false;
      persistenceStatus = "degraded";
      // Startup hydration is non-crashing, safe error returned
      return { success: false, mode, count: 0, error: "Không thể kết nối cơ sở dữ liệu để đồng bộ trạng thái." };
    }
  },

  async setModuleState(input: {
    moduleId: string;
    state: "enabled" | "disabled" | "degraded";
    updatedBy: string;
    reason?: string;
    expectedVersion?: number;
  }): Promise<PersistedModuleState> {
    const mod = moduleRegistry.getModule(input.moduleId);
    if (!mod) {
      throw new AppError(
        "MODULE_UNAVAILABLE",
        `Không tìm thấy mô-đun mang ID '${input.moduleId}' để cập nhật.`
      );
    }

    if (input.reason && input.reason.length > 500) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Lý do cập nhật (reason) không được vượt quá 500 ký tự."
      );
    }

    const repo = getModuleStateRepository();
    try {
      // 1. Write persistence first (inside transactions if supported by adapter)
      const record = await repo.set({
        moduleId: input.moduleId,
        state: input.state,
        updatedBy: input.updatedBy,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
      });

      // 2. Update runtime memory state only after successful write
      moduleRegistry.updateModuleState(input.moduleId, record.state);

      return record;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`ModuleStateService: Giao dịch cập nhật trạng thái lỗi: ${error.message}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Không thể lưu trạng thái mô-đun tại thời điểm này."
      );
    }
  }
};

export function requireModuleEnabled(moduleId: string) {
  return (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      moduleStateService.assertModuleEnabled(moduleId, req.requestId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
