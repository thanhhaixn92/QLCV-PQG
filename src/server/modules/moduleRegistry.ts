import { RegisteredModule } from "./moduleTypes";
import { appModuleManifestSchema } from "../../shared/schemas/moduleManifestSchema";
import { ModuleState } from "../../shared/contracts/moduleContracts";
import { logger } from "../infrastructure/logging/logger";

class ModuleRegistryClass {
  private modules = new Map<string, RegisteredModule>();

  registerModule(manifestInput: unknown, defaultState: ModuleState = "disabled"): { success: boolean; error?: string } {
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

      // Detect dependency absences (does not crash core app, logs warning)
      for (const reqDep of manifest.dependencies.required) {
        if (!this.modules.has(reqDep)) {
          logger.warn(`ModuleRegistry: Mô-đun '${manifest.id}' yêu cầu dependency '${reqDep}' nhưng hiện chưa được đăng ký trong hệ thống.`);
        }
      }

      this.modules.set(manifest.id, {
        manifest,
        state: defaultState
      });

      logger.info(`ModuleRegistry: Đăng ký thành công mô-đun '${manifest.id}' ở trạng thái '${defaultState}'`);
      return { success: true };
    } catch (e: any) {
      const errMsg = `Lỗi hệ thống khi đăng ký mô-đun: ${e.message}`;
      logger.error(`ModuleRegistry: ${errMsg}`, e);
      return { success: false, error: errMsg };
    }
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
    logger.info(`ModuleRegistry: Mô-đun '${id}' được chuyển trạng thái sang '${state}'`);
    return true;
  }
}

export const moduleRegistry = new ModuleRegistryClass();
