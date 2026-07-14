import { moduleRegistry } from "./moduleRegistry";
import { toolRegistry } from "../agent/toolRegistry";
import { moduleCatalog } from "./moduleCatalog";

export function registerAllModules() {
  // Clear any existing registrations first for safe hot-reload/test initialization
  moduleRegistry.clear();
  toolRegistry.clear();

  for (const mod of moduleCatalog) {
    moduleRegistry.registerModule(
      mod.manifest,
      "disabled",
      mod.registerRoutes
    );
  }

  // Perform post-registration validation on the dependency graph
  const validationResult = moduleRegistry.validateDependencies();
  if (!validationResult.success) {
    throw new Error(`Đăng ký mô-đun thất bại do lỗi phụ thuộc: ${validationResult.errors.join("; ")}`);
  }
}

