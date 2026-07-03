import { z } from "zod";

export const moduleStateSchema = z.enum([
  "enabled",
  "disabled",
  "degraded",
  "unavailable",
]);

export const appModuleManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  description: z.string(),
  routes: z.array(z.string()),
  requiredPermissions: z.array(z.string()),
  dependencies: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()),
  }),
  tools: z.array(z.string()),
});
