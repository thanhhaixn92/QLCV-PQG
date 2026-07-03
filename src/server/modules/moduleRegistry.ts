import { RegisteredModule } from "./moduleTypes";
import { appModuleManifestSchema } from "../../shared/schemas/moduleManifestSchema";
import { ModuleState } from "../../shared/contracts/moduleContracts";
import { logger } from "../infrastructure/logging/logger";
import { Router } from "express";

class ModuleRegistryClass {
  private modules = new Map<string, RegisteredModule>();

  clear() {
    this.modules.clear();
    logger.info("ModuleRegistry: Đã xóa toàn bộ đăng ký mô-đun (đặt lại trạng thái).");
  }

  registerModule(manifestInput: unknown, defaultState: ModuleState = "disabled", registerRoutes?: (router: Router) => void): { success: boolean; error?: string } {
    try {
      const parseResult = appModuleManifestSchema.safeParse(manifestInput);
      if (!parseResult.success) {
        const errMsg = `Xác thực manifest thất bại: ${parseResult.error.message}`;
        logger.error(`ModuleRegistry: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      const manifest = parseResult.data;

      if (this.modules.has(manifest.id)) {
        const errMsg = `Phát hiện ID mô-đun trùng lặp: ${manifest.id}`;
        logger.error(`ModuleRegistry: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      this.modules.set(manifest.id, {
        manifest,
        state: defaultState,
        registerRoutes
      });

      logger.info(`ModuleRegistry: Đăng ký thành công mô-đun '${manifest.id}' ở trạng thái '${defaultState}'`);
      return { success: true };
    } catch (e: any) {
      const errMsg = `Lỗi hệ thống khi đăng ký mô-đun: ${e.message}`;
      logger.error(`ModuleRegistry: ${errMsg}`, e);
      return { success: false, error: errMsg };
    }
  }

  validateDependencies(): { success: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const mod of this.modules.values()) {
      for (const reqDep of mod.manifest.dependencies.required) {
        if (!this.modules.has(reqDep)) {
          const warnMsg = `Mô-đun '${mod.manifest.id}' yêu cầu dependency bắt buộc '${reqDep}' nhưng hiện chưa được đăng ký trong hệ thống.`;
          logger.warn(`ModuleRegistry: ${warnMsg}`);
          warnings.push(warnMsg);
        }
      }
    }

    return {
      success: warnings.length === 0,
      warnings,
      errors
    };
  }

  getModule(id: string): RegisteredModule | undefined {
    return this.modules.get(id);
  }

  getAllModules(): RegisteredModule[] {
    return Array.from(this.modules.values());
  }

  updateModuleState(id: string, state: ModuleState): boolean {
    const mod = this.modules.get(id);
    if (!mod) return false;
    mod.state = state;
    logger.info(`ModuleRegistry: Mô-đun '${id}' được chuyển trạng thái sang '${state}' (In-memory implementation)`);
    return true;
  }
}

export const moduleRegistry = new ModuleRegistryClass();
