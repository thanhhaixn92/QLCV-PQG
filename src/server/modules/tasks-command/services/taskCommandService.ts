import { getTaskCommandRepository } from "../data/taskCommandRepository";
import { CreateTaskCommand, UpdateTaskCommand, AssignTaskCommand, TransitionTaskCommand, TaskCommandContext, TaskRecord } from "../contracts/taskCommandTypes";
import { auditService } from "../../../audit/auditService";
import { AppError } from "../../../../shared/errors/appError";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const taskCommandService = {
  async createTask(command: CreateTaskCommand, context: TaskCommandContext): Promise<TaskRecord> {
    try {
      const repo = getTaskCommandRepository();
      const result = await repo.create({
        title: command.title,
        description: command.description ?? null,
        priority: command.priority ?? null,
        departmentId: command.departmentId ?? null,
        collaboratorIds: command.collaboratorIds,
        attachments: command.attachments,
        dueAt: command.dueAt ?? null
      }, context);

      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.created",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: result.id,
        requestId: context.requestId,
        result: "success"
      });

      return result;
    } catch (error: unknown) {
      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.created",
        moduleId: "tasks-command",
        targetType: "task",
        requestId: context.requestId,
        result: error instanceof AppError && error.code === "PERMISSION_DENIED" ? "denied" : "failed",
        reason: getErrorMessage(error)
      });
      throw error;
    }
  },

  async updateTask(taskId: string, command: UpdateTaskCommand, context: TaskCommandContext): Promise<TaskRecord> {
    try {
      const repo = getTaskCommandRepository();
      const result = await repo.update(taskId, {
        title: command.title,
        description: command.description,
        priority: command.priority,
        collaboratorIds: command.collaboratorIds,
        attachments: command.attachments,
        dueAt: command.dueAt
      }, command.expectedVersion, context);

      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.updated",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: "success"
      });

      return result;
    } catch (error: unknown) {
      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.updated",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: error instanceof AppError && error.code === "PERMISSION_DENIED" ? "denied" : "failed",
        reason: getErrorMessage(error)
      });
      throw error;
    }
  },

  async assignTask(taskId: string, command: AssignTaskCommand, context: TaskCommandContext): Promise<TaskRecord> {
    try {
      const repo = getTaskCommandRepository();
      const assigneeRef = command.assigneeUid ? {
        uid: command.assigneeUid,
        displayName: `User ${command.assigneeUid}`
      } : null;

      const result = await repo.assign(taskId, assigneeRef, command.expectedVersion, context);

      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.assigned",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: "success"
      });

      return result;
    } catch (error: unknown) {
      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.assigned",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: error instanceof AppError && error.code === "PERMISSION_DENIED" ? "denied" : "failed",
        reason: getErrorMessage(error)
      });
      throw error;
    }
  },

  async transitionTask(taskId: string, command: TransitionTaskCommand, context: TaskCommandContext): Promise<TaskRecord> {
    try {
      const repo = getTaskCommandRepository();
      const result = await repo.transition(taskId, command.transition, command.expectedVersion, context);

      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.transitioned",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: "success"
      });

      return result;
    } catch (error: unknown) {
      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.transitioned",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: error instanceof AppError && error.code === "PERMISSION_DENIED" ? "denied" : "failed",
        reason: getErrorMessage(error)
      });
      throw error;
    }
  },

  async archiveTask(taskId: string, expectedVersion: number, context: TaskCommandContext): Promise<void> {
    try {
      const repo = getTaskCommandRepository();
      await repo.archive(taskId, expectedVersion, context);

      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.archived",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: "success"
      });
    } catch (error: unknown) {
      auditService.logEvent({
        actor: { type: "user", id: context.actorUid },
        action: "task.archived",
        moduleId: "tasks-command",
        targetType: "task",
        targetId: taskId,
        requestId: context.requestId,
        result: error instanceof AppError && error.code === "PERMISSION_DENIED" ? "denied" : "failed",
        reason: getErrorMessage(error)
      });
      throw error;
    }
  }
};
