import { AgentTool } from "../../../agent/toolTypes";
import { ToolExecutionContext } from "../../../agent/agentTypes";
import { getTaskQueryRepository } from "../../tasks-query/data/taskQueryRepository";
import { taskCommandService } from "../../tasks-command/services/taskCommandService";
import { TaskQueryContext } from "../../../../shared/contracts/tasks/taskQueryContracts";
import { TaskCommandContext } from "../../tasks-command/contracts/taskCommandTypes";
import { UserRole, Permission } from "../../../../shared/permissions/permissions";

export const listTasksTool: AgentTool = {
  name: "list_tasks",
  description: "Lấy danh sách các công việc hiện tại, hỗ trợ lọc theo phòng ban hoặc người được phân công.",
  moduleId: "tasks-query",
  risk: "read",
  requiredPermissions: ["tasks.read"],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Số lượng tối đa công việc muốn lấy." },
      departmentId: { type: "string", description: "Mã phòng ban cần lọc." },
      assigneeUid: { type: "string", description: "UID của người được phân công cần lọc." }
    }
  },
  outputSchema: {
    type: "object"
  },
  async execute(input: { limit?: number; departmentId?: string; assigneeUid?: string }, context: ToolExecutionContext) {
    const actorUid = context.userId || "anonymous";
    const actorRole = context.userRole || "viewer";
    const permissions = context.permissions || [];
    const departmentIds = context.departments || ["dept-a"];

    const queryContext: TaskQueryContext = {
      actorUid,
      actorRole,
      permissions: [...permissions],
      departmentIds: [...departmentIds]
    };

    const repo = getTaskQueryRepository();
    const result = await repo.list({
      limit: input.limit ?? 10,
      departmentId: input.departmentId,
      assigneeUid: input.assigneeUid
    }, queryContext);

    return result;
  }
};

export const getTaskTool: AgentTool = {
  name: "get_task",
  description: "Xem chi tiết một công việc dựa trên ID duy nhất.",
  moduleId: "tasks-query",
  risk: "read",
  requiredPermissions: ["tasks.read"],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID của công việc cần tra cứu." }
    },
    required: ["id"]
  },
  outputSchema: {
    type: "object"
  },
  async execute(input: { id: string }, context: ToolExecutionContext) {
    const actorUid = context.userId || "anonymous";
    const actorRole = context.userRole || "viewer";
    const permissions = context.permissions || [];
    const departmentIds = context.departments || ["dept-a"];

    const queryContext: TaskQueryContext = {
      actorUid,
      actorRole,
      permissions: [...permissions],
      departmentIds: [...departmentIds]
    };

    const repo = getTaskQueryRepository();
    const result = await repo.getById(input.id, queryContext);
    return result;
  }
};

export const createTaskTool: AgentTool = {
  name: "create_task",
  description: "Tạo một công việc mới. Yêu cầu nhập phòng ban và tiêu đề.",
  moduleId: "tasks-command",
  risk: "write",
  requiredPermissions: ["tasks.create"],
  requiresApproval: true,
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Tiêu đề của công việc mới." },
      description: { type: "string", description: "Mô tả chi tiết nội dung công việc." },
      priority: { type: "string", description: "Độ ưu tiên: 'low', 'medium', 'high', 'critical'." },
      departmentId: { type: "string", description: "Mã phòng ban chịu trách nhiệm chính." },
      dueAt: { type: "string", description: "Thời hạn hoàn thành công việc (ISO String, ví dụ: 2026-08-01T12:00:00.000Z)." }
    },
    required: ["title", "departmentId"]
  },
  outputSchema: {
    type: "object"
  },
  async execute(
    input: { title: string; description?: string; priority?: string; departmentId: string; dueAt?: string },
    context: ToolExecutionContext
  ) {
    const actorUid = context.userId || "anonymous";
    const actorRole = (context.userRole as UserRole) || "viewer";
    const requestId = context.requestId;
    const permissions = (context.permissions as Permission[]) || [];
    const departmentIds = context.departments || ["dept-a"];

    const commandContext: TaskCommandContext = {
      actorUid,
      actorRole,
      permissions,
      departmentIds,
      requestId
    };

    const result = await taskCommandService.createTask({
      title: input.title,
      description: input.description,
      priority: input.priority as any,
      departmentId: input.departmentId,
      collaboratorIds: [],
      attachments: []
    }, commandContext);

    return result;
  }
};

export const updateTaskTool: AgentTool = {
  name: "update_task",
  description: "Cập nhật các thuộc tính của một công việc đang có. Yêu cầu nhập đúng phiên bản (expectedVersion) để kiểm soát đồng thời (OCC).",
  moduleId: "tasks-command",
  risk: "write",
  requiredPermissions: ["tasks.update"],
  requiresApproval: true,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID của công việc cần cập nhật." },
      title: { type: "string", description: "Tiêu đề mới của công việc." },
      description: { type: "string", description: "Mô tả chi tiết mới." },
      priority: { type: "string", description: "Độ ưu tiên mới: 'low', 'medium', 'high', 'critical'." },
      expectedVersion: { type: "number", description: "Phiên bản hiện tại của tài liệu trước khi cập nhật (bắt buộc)." }
    },
    required: ["id", "expectedVersion"]
  },
  outputSchema: {
    type: "object"
  },
  async execute(
    input: { id: string; title?: string; description?: string; priority?: string; expectedVersion: number },
    context: ToolExecutionContext
  ) {
    const actorUid = context.userId || "anonymous";
    const actorRole = (context.userRole as UserRole) || "viewer";
    const requestId = context.requestId;
    const permissions = (context.permissions as Permission[]) || [];
    const departmentIds = context.departments || ["dept-a"];

    const commandContext: TaskCommandContext = {
      actorUid,
      actorRole,
      permissions,
      departmentIds,
      requestId
    };

    const result = await taskCommandService.updateTask(input.id, {
      title: input.title,
      description: input.description,
      priority: input.priority as any,
      collaboratorIds: undefined,
      attachments: undefined,
      expectedVersion: input.expectedVersion
    }, commandContext);

    return result;
  }
};

export const allAgentTools = [listTasksTool, getTaskTool, createTaskTool, updateTaskTool];
