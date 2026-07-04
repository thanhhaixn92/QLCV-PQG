import { TaskCommandRepository, TaskRecord, TaskCommandContext, TaskTransition, UserReference } from "../contracts/taskCommandTypes";
import { AppError } from "../../../../shared/errors/appError";
import { TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";
import { getConfiguredFirestore } from "../../../infrastructure/firebase/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export class FirestoreTaskCommandRepository implements TaskCommandRepository {
  async create(
    input: {
      title: string;
      description: string | null;
      priority: TaskPriority | null;
      departmentId: string | null;
      dueAt: string | null;
    },
    context: TaskCommandContext
  ): Promise<TaskRecord> {
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

    const db = getConfiguredFirestore();
    const taskId = `task-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    const task: TaskRecord = {
      id: taskId,
      title: input.title,
      description: input.description,
      status: "todo",
      priority: input.priority || "low",
      departmentId: input.departmentId,
      creator: {
        uid: context.actorUid,
        displayName: `User ${context.actorUid}` // This should ideally be fetched or passed, but keeping it simple as in mock
      },
      assignee: null,
      dueAt: input.dueAt,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
      archivedAt: null
    };

    try {
      await db.collection("tasks").doc(taskId).set(task);
      return task;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new AppError("INTERNAL_ERROR", `Lỗi khi lưu công việc vào cơ sở dữ liệu: ${errMsg}`, context.requestId, error);
    }
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
    const db = getConfiguredFirestore();
    const taskRef = db.collection("tasks").doc(taskId);

    try {
      return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(taskRef);
        if (!doc.exists) {
          throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
        }

        const task = doc.data() as TaskRecord;

        // Check RLS
        if (!(context.actorRole === "admin" || context.permissions.includes("tasks.manage"))) {
          if (context.actorRole === "manager") {
            if (task.departmentId && !context.departmentIds.includes(task.departmentId)) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc của phòng ban này.", context.requestId);
            }
          } else if (context.actorRole === "operator" || context.actorRole === "editor") {
            if (task.creator.uid !== context.actorUid && task.assignee?.uid !== context.actorUid) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc không do bạn tạo hoặc được phân công.", context.requestId);
            }
          } else {
            throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn thao tác dữ liệu này.", context.requestId);
          }
        }

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

        transaction.set(taskRef, updated);
        return updated;
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new AppError("INTERNAL_ERROR", `Lỗi khi cập nhật công việc trên cơ sở dữ liệu: ${errMsg}`, context.requestId, error);
    }
  }

  async transition(
    taskId: string,
    transition: TaskTransition,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const db = getConfiguredFirestore();
    const taskRef = db.collection("tasks").doc(taskId);

    try {
      return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(taskRef);
        if (!doc.exists) {
          throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
        }

        const task = doc.data() as TaskRecord;

        // Check RLS
        if (!(context.actorRole === "admin" || context.permissions.includes("tasks.manage"))) {
          if (context.actorRole === "manager") {
            if (task.departmentId && !context.departmentIds.includes(task.departmentId)) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc của phòng ban này.", context.requestId);
            }
          } else if (context.actorRole === "operator" || context.actorRole === "editor") {
            if (task.creator.uid !== context.actorUid && task.assignee?.uid !== context.actorUid) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc không do bạn tạo hoặc được phân công.", context.requestId);
            }
          } else {
            throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn thao tác dữ liệu này.", context.requestId);
          }
        }

        if (task.archivedAt) {
          throw new AppError("TASK_ARCHIVED", "Công việc đã bị lưu trữ, không thể chuyển trạng thái.", context.requestId);
        }

        if (task.version !== expectedVersion) {
          throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
        }

        let nextStatus = task.status;
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
        } else {
          throw new AppError("TASK_TRANSITION_NOT_ALLOWED", `Chuyển đổi trạng thái ${transition} chưa được hỗ trợ.`, context.requestId);
        }

        const updated: TaskRecord = {
          ...task,
          status: nextStatus,
          version: task.version + 1,
          updatedAt: new Date().toISOString()
        };

        transaction.set(taskRef, updated);
        return updated;
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new AppError("INTERNAL_ERROR", `Lỗi khi chuyển trạng thái trên cơ sở dữ liệu: ${errMsg}`, context.requestId, error);
    }
  }

  async assign(
    taskId: string,
    assignee: UserReference | null,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    const db = getConfiguredFirestore();
    const taskRef = db.collection("tasks").doc(taskId);

    try {
      return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(taskRef);
        if (!doc.exists) {
          throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
        }

        const task = doc.data() as TaskRecord;

        // Check RLS
        if (!(context.actorRole === "admin" || context.permissions.includes("tasks.manage"))) {
          if (context.actorRole === "manager") {
            if (task.departmentId && !context.departmentIds.includes(task.departmentId)) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc của phòng ban này.", context.requestId);
            }
          } else if (context.actorRole === "operator" || context.actorRole === "editor") {
            if (task.creator.uid !== context.actorUid && task.assignee?.uid !== context.actorUid) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc không do bạn tạo hoặc được phân công.", context.requestId);
            }
          } else {
            throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn thao tác dữ liệu này.", context.requestId);
          }
        }

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

        transaction.set(taskRef, updated);
        return updated;
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new AppError("INTERNAL_ERROR", `Lỗi khi phân công trên cơ sở dữ liệu: ${errMsg}`, context.requestId, error);
    }
  }

  async archive(
    taskId: string,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<void> {
    const db = getConfiguredFirestore();
    const taskRef = db.collection("tasks").doc(taskId);

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(taskRef);
        if (!doc.exists) {
          throw new AppError("TASK_NOT_FOUND", "Công việc không tồn tại.", context.requestId);
        }

        const task = doc.data() as TaskRecord;

        // Check RLS
        if (!(context.actorRole === "admin" || context.permissions.includes("tasks.manage"))) {
          if (context.actorRole === "manager") {
            if (task.departmentId && !context.departmentIds.includes(task.departmentId)) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc của phòng ban này.", context.requestId);
            }
          } else if (context.actorRole === "operator" || context.actorRole === "editor") {
            if (task.creator.uid !== context.actorUid && task.assignee?.uid !== context.actorUid) {
              throw new AppError("PERMISSION_DENIED", "Bạn không có quyền thao tác trên công việc không do bạn tạo hoặc được phân công.", context.requestId);
            }
          } else {
            throw new AppError("PERMISSION_DENIED", "Tài khoản không đủ quyền hạn thao tác dữ liệu này.", context.requestId);
          }
        }

        if (task.version !== expectedVersion) {
          throw new AppError("TASK_VERSION_CONFLICT", "Công việc đã được người khác cập nhật.", context.requestId);
        }

        const updated: TaskRecord = {
          ...task,
          archivedAt: new Date().toISOString(),
          version: task.version + 1,
          updatedAt: new Date().toISOString()
        };

        transaction.set(taskRef, updated);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new AppError("INTERNAL_ERROR", `Lỗi khi lưu trữ trên cơ sở dữ liệu: ${errMsg}`, context.requestId, error);
    }
  }
}
