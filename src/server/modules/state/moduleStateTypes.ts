import { ModuleState } from "../../../shared/contracts/moduleContracts";

export interface PersistedModuleState {
  moduleId: string;
  state: "enabled" | "disabled" | "degraded";
  version: number;
  updatedAt: Date;
  updatedBy: string;
  reason?: string;
}

export interface SetModuleStateInput {
  moduleId: string;
  state: "enabled" | "disabled" | "degraded";
  updatedBy: string;
  reason?: string;
  expectedVersion?: number;
}

export interface ModuleStateRepository {
  get(moduleId: string): Promise<PersistedModuleState | null>;
  set(input: SetModuleStateInput): Promise<PersistedModuleState>;
  list(): Promise<PersistedModuleState[]>;
}

export type ModuleStatePersistenceStatus = {
  status: "ready" | "degraded" | "unavailable";
  persistenceMode: "firestore" | "in-memory" | "unavailable";
  hydrated: boolean;
  lastHydratedAt: string | null;
};
