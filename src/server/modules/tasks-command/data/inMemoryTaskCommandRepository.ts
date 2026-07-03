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

export class InMemoryTaskCommandRepository implements TaskCommandRepository {
  async create(
    input: {
      title: string;
      description: string | null;
      priority: string | null;
      departmentId: string | null;
      assigneeUid: string | null;
    },
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const taskId = `task-mock-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const nowIso = new Date().toISOString();
    
    const task: TaskRecord = {
      id: taskId,
      title: input.title,
      description: input.description,
      status: "todo",
      priority: (input.priority as TaskPriority) || "low",
      departmentId: input.departmentId,
      creator: {
        uid: context.actorUid,
        displayName: `User ${context.actorUid}`
      },
      assignee: input.assigneeUid ? {
        uid: input.assigneeUid,
        displayName: `User ${input.assigneeUid}`
      } : null,
      dueAt: null,
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
      title: string;
      description: string | null;
      priority: string | null;
      dueAt: string | null;
    },
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const task = mockTasksStore.get(taskId);
    if (!task) {
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.");
    }

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể chỉnh sửa.");
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.");
    }

    const updated: TaskRecord = {
      ...task,
      title: input.title,
      description: input.description,
      priority: (input.priority as TaskPriority) || task.priority,
      dueAt: input.dueAt,
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
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.");
    }

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể chuyển trạng thái.");
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.");
    }

    let nextStatus: TaskStatus = task.status;
    
    if (transition === "start") {
      if (task.status !== "todo" && task.status !== "backlog") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang in_progress không hợp lệ từ ${task.status}.`);
      }
      nextStatus = "in_progress";
    } else if (transition === "complete") {
      if (task.status !== "in_progress" && task.status !== "todo") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái hoàn thành không hợp lệ từ ${task.status}.`);
      }
      nextStatus = "completed";
    } else if (transition === "reopen") {
      if (task.status !== "completed") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", "Chỉ công việc đã hoàn thành mới có thể mở lại.");
      }
      nextStatus = "todo";
    } else if (transition === "block") {
      if (task.status !== "in_progress") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang blocked không hợp lệ từ ${task.status}.`);
      }
      // Since TaskStatus of current model does not have "blocked", we can keep nextStatus as "in_progress" 
      // or if we ever expand, we can map it. For G6.0 we'll reject other transitions if status schema doesn't permit.
      // Wait, let's look at the TaskStatus from shared contract: backlog | todo | in_progress | completed
      // So let's throw transition error or simulate safely. Let's raise an error because they are not in the status enum yet.
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái block chưa được hỗ trợ bởi hệ thống danh mục hiện tại.`);
    } else if (transition === "cancel") {
      if (task.status !== "todo" && task.status !== "in_progress") {
        throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển trạng thái sang cancelled không hợp lệ từ ${task.status}.`);
      }
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái cancel chưa được hỗ trợ bởi hệ thống danh mục hiện tại.`);
    } else {
      throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái ${transition} chưa được cấu hình.`);
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
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.");
    }

    if (task.archivedAt) {
      throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể phân công.");
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.");
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
      throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.");
    }

    if (task.version !== expectedVersion) {
      throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.");
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
