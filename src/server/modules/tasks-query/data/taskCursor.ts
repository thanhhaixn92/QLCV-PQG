import { z } from "zod";
import { AppError } from "../../../../shared/errors/appError";
import { TaskListQuery } from "../../../../shared/contracts/tasks/taskQueryContracts";

const cursorDataSchema = z.object({
  version: z.literal(1),
  sortBy: z.enum(["updatedAt", "dueAt", "createdAt"]),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  sortValue: z.union([z.string(), z.number(), z.null()]),
  documentId: z.string().min(1),
  queryFingerprint: z.string()
});

export type CursorData = z.infer<typeof cursorDataSchema>;

function generateQueryFingerprint(query?: TaskListQuery): string {
  const q = query ?? {};
  const obj = {
    status: q.status ?? "",
    priority: q.priority ?? "",
    assigneeUid: q.assigneeUid ?? "",
    departmentId: q.departmentId ?? "",
    dueFrom: q.dueFrom ?? "",
    dueTo: q.dueTo ?? "",
    updatedAfter: q.updatedAfter ?? "",
    sortBy: q.sortBy ?? "updatedAt",
    sortDirection: q.sortDirection ?? "desc",
  };
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64url");
}

export const taskCursor = {
  serialize(
    data: {
      sortBy: "updatedAt" | "dueAt" | "createdAt";
      sortDirection?: "asc" | "desc";
      sortValue: string | number | null;
      documentId: string;
    },
    query?: TaskListQuery
  ): string {
    const fingerprint = generateQueryFingerprint(query);
    const fullCursor: CursorData = {
      version: 1,
      sortBy: data.sortBy,
      sortDirection: data.sortDirection ?? (query ? query.sortDirection : undefined) ?? "desc",
      sortValue: data.sortValue,
      documentId: data.documentId,
      queryFingerprint: fingerprint
    };
    const jsonStr = JSON.stringify(fullCursor);
    return Buffer.from(jsonStr, "utf-8").toString("base64url");
  },

  deserialize(
    cursorStr: string,
    expectedSortBy: "updatedAt" | "dueAt" | "createdAt",
    query?: TaskListQuery
  ): CursorData {
    if (cursorStr.length > 2048) {
      throw new AppError("VALIDATION_FAILED", "Mã phân trang (cursor) vượt quá độ dài tối đa cho phép.");
    }

    let decodedStr: string;
    try {
      decodedStr = Buffer.from(cursorStr, "base64url").toString("utf-8");
    } catch {
      throw new AppError("VALIDATION_FAILED", "Mã phân trang (cursor) không đúng định dạng base64url.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decodedStr);
    } catch {
      throw new AppError("VALIDATION_FAILED", "Mã phân trang (cursor) không đúng định dạng JSON.");
    }

    const parseResult = cursorDataSchema.safeParse(parsed);
    if (!parseResult.success) {
      throw new AppError("VALIDATION_FAILED", "Mã phân trang (cursor) có cấu trúc không hợp lệ.");
    }

    const data = parseResult.data;
    if (data.sortBy !== expectedSortBy) {
      throw new AppError("VALIDATION_FAILED", `Mã phân trang không khớp với tiêu chí sắp xếp hiện tại (${expectedSortBy}).`);
    }

    const currentFingerprint = generateQueryFingerprint(query);
    if (data.queryFingerprint !== currentFingerprint) {
      throw new AppError("VALIDATION_FAILED", "Mã phân trang (cursor) không tương thích với bộ lọc truy vấn hiện tại.");
    }

    return data;
  }
};
