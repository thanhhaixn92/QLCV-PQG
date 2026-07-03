import { AppRequest } from "../../auth/authTypes";
import { getTaskQueryRepository } from "./data/taskQueryRepository";
import { TaskListResult, TaskQueryContext } from "../../../shared/contracts/tasks/taskQueryContracts";
import { taskListQuerySchema } from "../../../shared/contracts/tasks/taskSchemas";
import { ROLE_PERMISSIONS, Permission } from "../../../shared/permissions/permissions";
import { TaskSummary } from "../../../shared/contracts/tasks/taskContracts";

export const tasksQueryService = {
  async getTasks(req: AppRequest): Promise<TaskListResult> {
    // 1. Validate query parameters using Zod
    const parsedQuery = taskListQuerySchema.parse(req.query);
    if (req.query.forceMissingIndexError) {
      (parsedQuery as any).forceMissingIndexError = req.query.forceMissingIndexError === "true";
    }

    // 2. Construct security context
    const actorUid = req.user?.uid || "anonymous";
    const actorRole = req.user?.role || "viewer";
    
    // Resolve base permissions
    const defaultPermissions = ROLE_PERMISSIONS[actorRole] || [];
    let permissions: string[] = [...defaultPermissions];

    // Testing/mock override support via headers
    if (req.headers["x-user-permissions"]) {
      const headerPerms = String(req.headers["x-user-permissions"])
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      permissions = headerPerms;
    }

    let departmentIds: string[] = ["dept-a"];
    if (req.headers["x-user-departments"]) {
      departmentIds = String(req.headers["x-user-departments"])
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }

    const context: TaskQueryContext = {
      actorUid,
      actorRole,
      permissions,
      departmentIds
    };

    // 3. Fetch from repository
    const repo = getTaskQueryRepository();
    return await repo.list(parsedQuery, context);
  },

  async getTaskById(taskId: string, req: AppRequest): Promise<TaskSummary | null> {
    const actorUid = req.user?.uid || "anonymous";
    const actorRole = req.user?.role || "viewer";
    
    const defaultPermissions = ROLE_PERMISSIONS[actorRole] || [];
    let permissions: string[] = [...defaultPermissions];

    if (req.headers["x-user-permissions"]) {
      const headerPerms = String(req.headers["x-user-permissions"])
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      permissions = headerPerms;
    }

    let departmentIds: string[] = ["dept-a"];
    if (req.headers["x-user-departments"]) {
      departmentIds = String(req.headers["x-user-departments"])
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }

    const context: TaskQueryContext = {
      actorUid,
      actorRole,
      permissions,
      departmentIds
    };

    const repo = getTaskQueryRepository();
    return await repo.getById(taskId, context);
  }
};
