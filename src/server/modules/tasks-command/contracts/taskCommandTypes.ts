import { TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";
import { UserRole, Permission } from "../../../../shared/permissions/permissions";

export type TaskTransition = "start" | "complete" | "reopen";

export interface UserReference {
  uid: string;
  displayName?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  departmentId: string | null;
  creator: UserReference;
  assignee: UserReference | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  archivedAt: string | null;
}

export interface TaskCommandContext {
  actorUid: string;
  actorRole: UserRole;
  permissions: readonly Permission[];
  departmentIds: readonly string[];
  requestId: string;
}

export interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  departmentId?: string | null;
  dueAt?: string | null;
}

export interface UpdateTaskCommand {
  title?: string;
  description?: string | null;
  priority?: TaskPriority | null;
  dueAt?: string | null;
  expectedVersion: number;
}

export interface AssignTaskCommand {
  assigneeUid: string | null;
  expectedVersion: number;
}

export interface TransitionTaskCommand {
  transition: TaskTransition;
  expectedVersion: number;
}

export interface ArchiveTaskCommand {
  expectedVersion: number;
}

export interface TaskCommandRepository {
  create(
    input: {
      title: string;
      description: string | null;
      priority: TaskPriority | null;
      departmentId: string | null;
      dueAt: string | null;
    },
    context: TaskCommandContext
  ): Promise<TaskRecord>;

  update(
    taskId: string,
    input: {
      title?: string;
      description?: string | null;
      priority?: TaskPriority | null;
      dueAt?: string | null;
    },
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord>;

  transition(
    taskId: string,
    transition: TaskTransition,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord>;

  assign(
    taskId: string,
    assignee: UserReference | null,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord>;

  archive(
    taskId: string,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<void>;
}
