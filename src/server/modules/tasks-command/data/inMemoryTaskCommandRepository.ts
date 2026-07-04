import { TaskCommandRepository, TaskRecord, TaskCommandContext, TaskTransition, UserReference } from "../contracts/taskCommandTypes";
import { AppError } from "../../../../shared/errors/appError";
import { TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";

// Shared tasks mock store for in-memory simulation, keeping state isolated or resetting via a helper
let mockTasksStore = new Map<string, TaskRecord>();

export function resetMockTasksStore(initialTasks?: TaskRecord[]) {
  mockTasksStore.clear();
  if (initialTasks) {
    for (const t of initialTasks) {
      mockTasksStore.set(t.id, t);
    }
  }
}

function checkRowLevelSecurity(task: TaskRecord, context: TaskCommandContext): void {
  if (context.actorRole === "admin" || context.permissions.includes("tasks.manage")) {
    return;
  }
  
  if (context.actorRole === "manager") {
    if (task.departmentId && context.departmentIds.includes(task.departmentId)) {
      return;
    }
    throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc của phòng ban này.");
  }
  
  if (context.actorRole === "operator" || context.actorRole === "editor") {
    if (task.creator.uid === context.actorUid || task.assignee?.uid === context.actorUid) {
      return;
    }
    throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc không do bạn tạo hoặc được phân công.");
  }

  throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn thao tác dữ liệu này.");
}

export class InMemoryTaskCommandRepository implements TaskCommandRepository {
  async create(
    input: {
      title: string;
      description: string | null;
      priority: TaskPriority | null;
      departmentId: string | null;
      assigneeUid: string | null;
      dueAt: string | null;
    },
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const taskId = `task-mock-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const nowIso = new Date().toISOString();
    
    if (!(context.actorRole === "admin" || context.permissions.includes("tasks.manage"))) {
      if (context.actorRole === "manager") {
        if (!input.departmentId || !context.departmentIds.includes(input.departmentId)) {
          throw new AppError("PERMISSION_DENIED", "Quản lý phòng ban phải cung cấp mã phòng ban hợp lệ khi tạo công việc.", context.requestId);
        }
      } else if (context.actorRole === "operator" || context.actorRole === "editor") {
        if (input.departmentId && !context.departmentIds.includes(input.departmentId)) {
          throw new AppError("PERMISSION_DENIED", "Bạn không có quyền gán công việc cho phòng ban này.", context.requestId);
        }
      } else {
        throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn tạo công việc.", context.requestId);
      }
    }

    const task: TaskRecord = {
      id: taskId,
      title: input.title,
      description: input.description,
      status: "todo",
      priority: input.priority || "low",
      departmentId: input.departmentId,
      creator: {
        uid: context.actorUid,
        displayName: `User ${context.actorUid}`
      },
      assignee: null,
      dueAt: input.dueAt,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
      archivedAt: null
    };

    mockTasksStore.set(taskId, task);
    return task;
  }

  async update(
    taskId: string,
    input: {
      title?: string;
      description?: string | null;
      priority?: TaskPriority | null;
      dueAt?: string | null;
    },
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const task = mockTasksStore.get(taskId);
    if (!task) {
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
    }
    
    checkRowLevelSecurity(task, context);

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể chỉnh sửa.", context.requestId);
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
    }

    const updated: TaskRecord = {
      ...task,
      title: input.title !== undefined ? input.title : task.title,
      description: input.description !== undefined ? input.description : task.description,
      priority: input.priority !== undefined ? input.priority : task.priority,
      dueAt: input.dueAt !== undefined ? input.dueAt : task.dueAt,
      version: task.version + 1,
      updatedAt: new Date().toISOString()
    };

    mockTasksStore.set(taskId, updated);
    return updated;
  }

  async transition(
    taskId: string,
    transition: TaskTransition,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const task = mockTasksStore.get(taskId);
    if (!task) {
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
    }
    
    checkRowLevelSecurity(task, context);

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể chuyển trạng thái.", context.requestId);
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
    }

    let nextStatus: TaskStatus = task.status;
    
    if (transition === "start") {
      if (task.status !== "todo" && task.status !== "backlog") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang in_progress không hợp lệ từ ${task.status}.`, context.requestId);
      }
      nextStatus = "in_progress";
    } else if (transition === "complete") {
      if (task.status !== "in_progress" && task.status !== "todo") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái hoàn thành không hợp lệ từ ${task.status}.`, context.requestId);
      }
      nextStatus = "completed";
    } else if (transition === "reopen") {
      if (task.status !== "completed") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", "Chỉ công việc đã hoàn thành mới có thể mở lại.", context.requestId);
      }
      nextStatus = "todo";
    } else if (transition === "block") {
      if (task.status !== "in_progress") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang blocked không hợp lệ từ ${task.status}.`, context.requestId);
      }
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái block chưa được hỗ trợ bởi hệ thống danh mục hiện tại.`, context.requestId);
    } else if (transition === "cancel") {
      if (task.status !== "todo" && task.status !== "in_progress") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang cancelled không hợp lệ từ ${task.status}.`, context.requestId);
      }
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái cancel chưa được hỗ trợ bởi hệ thống danh mục hiện tại.`, context.requestId);
    } else {
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái ${transition} chưa được cấu hình.`, context.requestId);
    }

    const updated: TaskRecord = {
      ...task,
      status: nextStatus,
      version: task.version + 1,
      updatedAt: new Date().toISOString()
    };

    mockTasksStore.set(taskId, updated);
    return updated;
  }

  async assign(
    taskId: string,
    assignee: UserReference | null,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const task = mockTasksStore.get(taskId);
    if (!task) {
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
    }
    
    checkRowLevelSecurity(task, context);

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể phân công.", context.requestId);
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
    }

    const updated: TaskRecord = {
      ...task,
      assignee,
      version: task.version + 1,
      updatedAt: new Date().toISOString()
    };

    mockTasksStore.set(taskId, updated);
    return updated;
  }

  async archive(
    taskId: string,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<void> {
    const task = mockTasksStore.get(taskId);
    if (!task) {
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
    }
    
    checkRowLevelSecurity(task, context);

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
    }

    const updated: TaskRecord = {
      ...task,
      archivedAt: new Date().toISOString(),
      version: task.version + 1,
      updatedAt: new Date().toISOString()
    };

    mockTasksStore.set(taskId, updated);
  }
}
