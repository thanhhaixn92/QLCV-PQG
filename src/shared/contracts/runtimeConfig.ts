import { ModuleState } from "./moduleContracts";

export interface RuntimeConfig {
  version: number;
  environment: string;
  allowMockAuth?: boolean;
  modules: Record<string, {
    state: ModuleState;
  }>;
}
