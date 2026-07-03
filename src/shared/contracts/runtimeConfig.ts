import { ModuleState } from "./moduleContracts";

export interface RuntimeConfig {
  version: number;
  environment: string;
  modules: Record<string, {
    state: ModuleState;
  }>;
}
