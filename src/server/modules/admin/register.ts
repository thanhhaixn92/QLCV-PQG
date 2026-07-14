import { adminManifest } from "./manifest";
import { registerAdminRoutes } from "./routes/adminRoutes";

export const adminPanelModule = {
  manifest: adminManifest,
  registerRoutes: registerAdminRoutes
};

export default adminPanelModule;
