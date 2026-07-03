import { AppModuleManifest, ModuleState } from "../../shared/contracts/moduleContracts";
import { Router } from "express";

export interface RegisteredModule {
  manifest: AppModuleManifest;
  state: ModuleState;
  registerRoutes?: (router: Router) => void;
}
