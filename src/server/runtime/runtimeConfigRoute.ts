import { Response, NextFunction } from "express";
import { AppRequest } from "../auth/authTypes";
import { moduleRegistry } from "../modules/moduleRegistry";
import { serverConfig } from "../app/serverConfig";
import { RuntimeConfig } from "../../shared/contracts/runtimeConfig";

export const runtimeConfigRoute = (req: AppRequest, res: Response, next: NextFunction) => {
  try {
    const registered = moduleRegistry.getAllModules();
    const modulesMap: Record<string, { state: any }> = {};

    for (const mod of registered) {
      modulesMap[mod.manifest.id] = {
        state: mod.state
      };
    }

    const config: RuntimeConfig = {
      version: 1,
      environment: serverConfig.nodeEnv,
      modules: modulesMap
    };

    res.json(config);
  } catch (error) {
    next(error);
  }
};
