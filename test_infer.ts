import { z } from "zod";
const assignTaskSchema = z.object({
  assigneeUid: z.string().trim().min(1, "Mã người nhận không được để trống").nullable(),
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();

type A = z.infer<typeof assignTaskSchema>;
// print out if it is optional
