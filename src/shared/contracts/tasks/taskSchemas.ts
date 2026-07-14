import { z } from "zod";

export const taskStatusSchema = z.enum(["backlog", "todo", "in_progress", "completed", "cancelled"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number().optional()
});

export const taskSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: taskStatusSchema,
  priority: taskPrioritySchema.nullable(),
  assignee: z.object({
    uid: z.string().optional(),
    displayName: z.string().optional()
  }).nullable(),
  creator: z.object({
    uid: z.string().optional(),
    displayName: z.string().optional()
  }).nullable(),
  departmentId: z.string().nullable(),
  collaboratorIds: z.array(z.string()).optional(),
  attachments: z.array(taskAttachmentSchema).optional(),
  dueAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  source: z.enum(["firestore", "fixture"])
});

// Validator for route query parameters
export const taskListQuerySchema = z.object({
  limit: z.preprocess(
    (val) => (val !== undefined && val !== "" ? parseInt(String(val), 10) : undefined),
    z.number().int().min(1).max(100).default(20)
  ),
  cursor: z.string().max(2048).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeUid: z.string().optional(),
  departmentId: z.string().optional(),
  dueFrom: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Sai định dạng ISO date cho dueFrom" }).optional(),
  dueTo: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Sai định dạng ISO date cho dueTo" }).optional(),
  updatedAfter: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Sai định dạng ISO date cho updatedAfter" }).optional(),
  sortBy: z.enum(["updatedAt", "dueAt", "createdAt"]).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
});
