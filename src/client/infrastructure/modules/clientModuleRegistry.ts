import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";
import React from "react";

export interface ClientModule {
  manifest: AppModuleManifest;
  routes: Array<{
    path: string;
    element: React.ReactNode;
  }>;
  menuItem?: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    path: string;
  };
}

class ClientModuleRegistryClass {
  private modules = new Map<string, ClientModule>();

  registerModule(mod: ClientModule) {
    if (this.modules.has(mod.manifest.id)) {
      console.warn(`ClientModuleRegistry: Trùng lặp đăng ký mô-đun '${mod.manifest.id}'`);
      return;
    }
    this.modules.set(mod.manifest.id, mod);
  }

  getModule(id: string): ClientModule | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ClientModule[] {
    return Array.from(this.modules.values());
  }
}

export const clientModuleRegistry = new ClientModuleRegistryClass();
