export type UserRole = "admin" | "manager" | "editor" | "operator" | "viewer";

export const ALL_PERMISSIONS = [
  "modules.read",
  "modules.manage",
  "tasks.read",
  "agent.use",
  "agent.tools.read",
  "audit.read",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    "modules.read",
    "modules.manage",
    "tasks.read",
    "agent.use",
    "agent.tools.read",
    "audit.read",
  ],
  manager: [
    "modules.read",
    "tasks.read",
    "agent.use",
    "agent.tools.read",
  ],
  editor: [
    "modules.read",
    "tasks.read",
    "agent.use",
  ],
  operator: [
    "modules.read",
    "tasks.read",
  ],
  viewer: [
    "modules.read",
  ],
};
