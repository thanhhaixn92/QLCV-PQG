import { z } from "zod";

export const persistedModuleStateSchema = z.object({
  moduleId: z.string().regex(/^[a-z0-9-]+$/),
  state: z.enum(["enabled", "disabled", "degraded"]),
  version: z.number().int().min(1),
  updatedAt: z.any(), // Conversions to Date handled inside adapters
  updatedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});
