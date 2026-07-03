import { ErrorCode } from "../errors/errorCodes";

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
  requestId: string;
}
