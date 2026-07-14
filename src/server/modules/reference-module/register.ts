import { referenceModuleManifest } from "./manifest";
import { registerReferenceRoutes } from "./routes";

export const referenceModule = {
  manifest: referenceModuleManifest,
  registerRoutes: registerReferenceRoutes
};

export default referenceModule;
