import { Response, NextFunction } from "express";
import { AppRequest } from "./authTypes";
import { serverConfig } from "../app/serverConfig";
import { AppError } from "../../shared/errors/appError";
import { resolveUserRole } from "./userRoleResolver";
import { verifyIdToken } from "../infrastructure/firebase/firebaseAdmin";
import { DecodedIdToken } from "firebase-admin/auth";
import { UserRole } from "../../shared/permissions/permissions";
import crypto from "crypto";

export const requestInitializer = (req: AppRequest, res: Response, next: NextFunction) => {
  let reqId = req.header("x-request-id") as string | undefined;

  // Giới hạn x-request-id: chỉ chấp nhận UUID hoặc chuỗi alphanumeric có gạch nối/gạch dưới, tối đa 100 kí tự.
  // Điều này ngăn chặn log injection và các dữ liệu quá dài nguy hiểm.
  const safeIdRegex = /^[a-zA-Z0-9_\-]{1,100}$/;
  if (!reqId || !safeIdRegex.test(reqId)) {
    reqId = crypto.randomUUID();
  }

  req.requestId = reqId;
  res.setHeader("x-request-id", reqId);
  next();
};

export const authenticateRequest = async (req: AppRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("authorization");
    
    if (!authHeader) {
      throw new AppError("AUTH_REQUIRED", "Yêu cầu đăng nhập để truy cập tài nguyên này.", req.requestId);
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AppError("VALIDATION_FAILED", "Định dạng token không hợp lệ (phải bắt đầu bằng Bearer).", req.requestId);
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError("AUTH_REQUIRED", "Yêu cầu đăng nhập để truy cập tài nguyên này.", req.requestId);
    }

    // 1. Kiểm tra nếu là mock token
    if (token.startsWith("mock-")) {
      // Chỉ cho phép mock token trong môi trường phát triển (NODE_ENV !== production) VÀ khi ALLOW_MOCK_AUTH được bật
      const isProd = serverConfig.nodeEnv === "production";
      if (isProd || !serverConfig.allowMockAuth) {
        throw new AppError(
          "AUTH_REQUIRED",
          "Môi trường này yêu cầu xác thực bằng tài khoản thực, không chấp nhận tài khoản giả lập.",
          req.requestId
        );
      }

      const rawPart = token.substring(5); // mock-role[:uid][:dept1,dept2]
      const parts = rawPart.split(":");
      const rolePart = parts[0];
      const customUid = parts.length > 1 && parts[1] ? parts[1] : undefined;
      const deptPart = parts.length > 2 && parts[2] ? parts[2] : undefined;

      const validRoles = ["admin", "manager", "editor", "operator", "viewer"];
      const role = validRoles.includes(rolePart) ? rolePart : "viewer";

      let departmentIds: readonly string[] = [];
      if (deptPart) {
        departmentIds = Array.from(new Set(deptPart.split(",").map(d => d.trim()).filter(Boolean)));
      }

      req.user = {
        uid: customUid || `mock-uid-${role}`,
        email: `${role}@qlcv.local`,
        emailVerified: true,
        role: role as UserRole,
        displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        departmentIds,
        isMock: true,
      };
      return next();
    }

    // 2. Với token không phải mock: bắt buộc gọi Firebase Admin verifyIdToken
    try {
      const decodedToken = await verifyIdToken(token) as DecodedIdToken;
      
      // Ánh xạ vai trò người dùng (user role resolver)
      const role = resolveUserRole(decodedToken, req.requestId);

      let departmentIds: readonly string[] = [];
      if (Array.isArray(decodedToken.departmentIds)) {
        departmentIds = Array.from(
          new Set(
            decodedToken.departmentIds
              .filter(d => typeof d === "string")
              .map(d => (d as string).trim())
              .filter(Boolean)
          )
        );
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        role,
        displayName: decodedToken.name || undefined,
        departmentIds,
        isMock: false,
      };
      
      next();
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === "PERMISSION_DENIED") {
        throw err;
      }
      // Ghi log chi tiết lỗi kỹ thuật phía server kèm requestId, tuyệt đối không log raw token
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[AuthError] RequestId: ${req.requestId}. Chi tiết lỗi xác thực:`, errorMessage);

      // Trả về thông báo chung, an toàn cho client
      throw new AppError("AUTH_REQUIRED", "Token không hợp lệ hoặc đã hết hạn.", req.requestId);
    }
  } catch (error) {
    next(error);
  }
};
