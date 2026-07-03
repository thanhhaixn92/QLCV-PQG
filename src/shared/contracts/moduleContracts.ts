import { z } from "zod";
import { appModuleManifestSchema, moduleStateSchema } from "../schemas/moduleManifestSchema";

export type AppModuleManifest = z.infer<typeof appModuleManifestSchema>;
export type ModuleState = z.infer<typeof moduleStateSchema>;

export interface ModuleStatus {
  id: string;
  state: ModuleState;
  manifest: AppModuleManifest;
}
