import { z } from "zod";
import { AppError } from "../../../../shared/errors/appError";

const cursorDataSchema = z.object({
  sortBy: z.enum(["updatedAt", "dueAt", "createdAt"]),
  sortValue: z.union([z.string(), z.number(), z.null()]),
  documentId: z.string().min(1)
});

export type CursorData = z.infer<typeof cursorDataSchema>;

export const taskCursor = {
  serialize(data: CursorData): string {
    const jsonStr = JSON.stringify(data);
    return Buffer.from(jsonStr, "utf-8").toString("base64url");
  },

  deserialize(cursorStr: string, expectedSortBy: "updatedAt" | "dueAt" | "createdAt"): CursorData {
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

    return data;
  }
};
