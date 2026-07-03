import { z } from "zod";
import { taskPrioritySchema } from "../../../../shared/contracts/tasks/taskSchemas";

export const taskTransitionSchema = z.enum(["start", "block", "complete", "cancel", "reopen"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề quá dài (tối đa 200 ký tự)"),
  description: z.string().trim().max(5000, "Mô tả quá dài (tối đa 5000 ký tự)").nullable().optional(),
  priority: taskPrioritySchema.nullable().optional(),
  departmentId: z.string().trim().min(1, "Mã phòng ban không được để trống").nullable().optional(),
  assigneeUid: z.string().trim().min(1, "Mã người nhận không được để trống").nullable().optional(),
  dueAt: z.string().datetime({ message: "Sai định dạng ISO date cho dueAt" }).nullable().optional()
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề quá dài (tối đa 200 ký tự)").optional(),
  description: z.string().trim().max(5000, "Mô tả quá dài (tối đa 5000 ký tự)").nullable().optional(),
  priority: taskPrioritySchema.nullable().optional(),
  dueAt: z.string().datetime({ message: "Sai định dạng ISO date cho dueAt" }).nullable().optional(),
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();

export const assignTaskSchema = z.object({
  assigneeUid: z.string().trim().min(1, "Mã người nhận không được để trống").nullable().optional(),
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();

export const transitionTaskSchema = z.object({
  transition: taskTransitionSchema,
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();

export const archiveTaskSchema = z.object({
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();
