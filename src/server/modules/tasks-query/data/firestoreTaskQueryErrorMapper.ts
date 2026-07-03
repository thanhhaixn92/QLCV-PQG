import { AppError } from "../../../../shared/errors/appError";
import { logger } from "../../../infrastructure/logging/logger";

interface FirestoreErrorLike {
  code?: number;
  message?: string;
}

/**
 * Maps a Firestore error to a sanitized AppError for the client,
 * while logging the raw technical details securely on the server.
 */
export function mapFirestoreError(error: unknown, contextMsg: string): AppError {
  const err = error as FirestoreErrorLike;

  // Handle Missing Composite Index (FAILED_PRECONDITION)
  if (err && (err.code === 9 || (typeof err.message === "string" && err.message.includes("FAILED_PRECONDITION")))) {
    const match = typeof err.message === "string" ? err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/) : null;
    const indexUrl = match ? match[0] : null;

    logger.error(
      `${contextMsg}: Thiếu index composite cho truy vấn này. URL tạo: ${indexUrl || "N/A"}. Lỗi gốc: ${err.message}`
    );

    return new AppError(
      "DEPENDENCY_UNAVAILABLE",
      "Truy vấn công việc hiện chưa được hệ thống hỗ trợ đầy đủ."
    );
  }

  // Handle other Firestore queries errors
  const errMsg = error instanceof Error ? error.message : String(error);
  logger.error(`${contextMsg}: Lỗi truy vấn Firestore: ${errMsg}`);

  return new AppError(
    "DEPENDENCY_UNAVAILABLE",
    "Dịch vụ lưu trữ Firestore gặp sự cố truy vấn tại thời điểm này."
  );
}
