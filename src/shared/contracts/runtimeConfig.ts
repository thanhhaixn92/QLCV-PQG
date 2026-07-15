import { ModuleState } from "./moduleContracts";

export interface RuntimeConfig {
  version: number;
  environment: string;
  allowMockAuth?: boolean;
  appMode?: string;
  appOwnerUid?: string;
  modules: Record<string, {
    state: ModuleState;
  }>;
}
