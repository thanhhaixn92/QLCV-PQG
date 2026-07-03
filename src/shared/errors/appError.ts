import { ErrorCode } from "./errorCodes";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }

  getStatusCode(): number {
    switch (this.code) {
      case "AUTH_REQUIRED":
        return 401;
      case "PERMISSION_DENIED":
      case "MODULE_DISABLED":
        return 403;
      case "VALIDATION_FAILED":
        return 400;
      case "DATA_CONFLICT":
        return 409;
      case "MODULE_UNAVAILABLE":
      case "DEPENDENCY_UNAVAILABLE":
      case "AI_UNAVAILABLE":
        return 503;
      case "INTERNAL_ERROR":
      default:
        return 500;
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId: this.requestId,
        details: this.details,
      },
    };
  }
}
