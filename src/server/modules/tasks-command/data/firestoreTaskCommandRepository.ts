import { TaskCommandRepository, TaskRecord, TaskCommandContext, TaskTransition, UserReference } from "../contracts/taskCommandTypes";
import { AppError } from "../../../../shared/errors/appError";

export class FirestoreTaskCommandRepository implements TaskCommandRepository {
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
    throw new AppError("NOT_IMPLEMENTED", "Chức năng tạo công việc trên Firestore chưa được triển khai.");
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
    throw new AppError("NOT_IMPLEMENTED", "Chức năng cập nhật công việc trên Firestore chưa được triển khai.");
  }

  async transition(
    taskId: string,
    transition: TaskTransition,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    throw new AppError("NOT_IMPLEMENTED", "Chuyển trạng thái công việc trên Firestore chưa được triển khai.");
  }

  async assign(
    taskId: string,
    assignee: UserReference | null,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<TaskRecord> {
    throw new AppError("NOT_IMPLEMENTED", "Phân công công việc trên Firestore chưa được triển khai.");
  }

  async archive(
    taskId: string,
    expectedVersion: number,
    context: TaskCommandContext
  ): Promise<void> {
    throw new AppError("NOT_IMPLEMENTED", "Lưu trữ công việc trên Firestore chưa được triển khai.");
  }
}
