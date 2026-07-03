import { AppModuleManifest, ModuleState } from "../../shared/contracts/moduleContracts";

export interface RegisteredModule {
  manifest: AppModuleManifest;
  state: ModuleState;
}
