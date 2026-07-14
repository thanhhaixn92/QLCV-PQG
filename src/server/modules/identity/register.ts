import { identityModuleManifest } from "./manifest";
import { registerIdentityRoutes } from "./routes";

export const identityModule = {
  manifest: identityModuleManifest,
  registerRoutes: registerIdentityRoutes
};

export default identityModule;
