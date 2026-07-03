import { moduleRegistry } from "./moduleRegistry";
import { AppError } from "../../shared/errors/appError";
import { ModuleState } from "../../shared/contracts/moduleContracts";

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
  }
};
