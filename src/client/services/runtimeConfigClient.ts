import { RuntimeConfig } from "../../shared/contracts/runtimeConfig";
import { apiClient } from "./apiClient";

export const runtimeConfigClient = {
  async getRuntimeConfig(): Promise<RuntimeConfig> {
    return apiClient.request<RuntimeConfig>("/api/runtime-config");
  }
};
