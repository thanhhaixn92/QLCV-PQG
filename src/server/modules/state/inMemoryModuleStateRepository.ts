import { ModuleStateRepository, PersistedModuleState, SetModuleStateInput } from "./moduleStateTypes";
import { persistedModuleStateSchema } from "./moduleStateSchemas";
import { AppError } from "../../../shared/errors/appError";

export class InMemoryModuleStateRepository implements ModuleStateRepository {
  private states = new Map<string, PersistedModuleState>();

  async get(moduleId: string): Promise<PersistedModuleState | null> {
    const state = this.states.get(moduleId);
    return state || null;
  }

  async set(input: SetModuleStateInput): Promise<PersistedModuleState> {
    const existing = this.states.get(input.moduleId);
    const currentVersion = existing ? existing.version : 0;

    if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
      throw new AppError(
        "DATA_CONFLICT",
        `Conflict: Phiên bản không khớp. Phiên bản hiện tại là ${currentVersion}, nhưng yêu cầu mong đợi là ${input.expectedVersion}.`
      );
    }

    const nextVersion = currentVersion + 1;
    const rawRecord = {
      moduleId: input.moduleId,
      state: input.state,
      version: nextVersion,
      updatedAt: new Date(),
      updatedBy: input.updatedBy,
      reason: input.reason,
    };

    const parseResult = persistedModuleStateSchema.safeParse(rawRecord);
    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Dữ liệu trạng thái mô-đun lưu trữ không hợp lệ.",
        undefined,
        parseResult.error.format()
      );
    }

    const record: PersistedModuleState = {
      ...parseResult.data,
      updatedAt: rawRecord.updatedAt, // keep Date object
    };

    this.states.set(input.moduleId, record);
    return record;
  }

  async list(): Promise<PersistedModuleState[]> {
    return Array.from(this.states.values());
  }

  // Helper for tests to pre-seed state
  seed(states: PersistedModuleState[]) {
    this.states.clear();
    for (const state of states) {
      this.states.set(state.moduleId, state);
    }
  }
}
