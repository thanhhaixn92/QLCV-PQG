import { Response, NextFunction } from "express";
import { AppRequest } from "./authTypes";
import { Permission, ROLE_PERMISSIONS } from "../../shared/permissions/permissions";
import { AppError } from "../../shared/errors/appError";
import { serverConfig } from "../app/serverConfig";
import { auditService } from "../audit/auditService";

export const requireOwner = (req: AppRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError("AUTH_REQUIRED", "Yêu cầu xác thực tài khoản.", req.requestId);
    }

    const user = req.user;

    // Reject mock tokens in production or if allowMockAuth is false
    if (user.isMock) {
      if (serverConfig.nodeEnv === "production" || process.env.NODE_ENV === "production" || !serverConfig.allowMockAuth) {
        throw new AppError(
          "AUTH_REQUIRED",
          "Môi trường này yêu cầu xác thực bằng tài khoản thực, không chấp nhận tài khoản giả lập.",
          req.requestId
        );
      }
    }

    // Verify email is verified (unless mock is allowed and this is a mock user)
    if (!user.isMock && !user.emailVerified) {
      auditService.logEvent({
        actor: { type: "user", id: user.uid },
        action: "auth.owner_access_denied",
        requestId: req.requestId || "unknown",
        result: "denied",
        reason: "Owner chưa xác minh email",
        metadata: {
          uid: user.uid,
          email: user.email,
          reason: "Email not verified"
        }
      });
      throw new AppError(
        "PERMISSION_DENIED",
        "Tài khoản chưa xác minh email.",
        req.requestId
      );
    }

    // Verify UID is the App Owner UID
    if (user.uid !== serverConfig.appOwnerUid) {
      auditService.logEvent({
        actor: { type: "user", id: user.uid },
        action: "auth.owner_access_denied",
        requestId: req.requestId || "unknown",
        result: "denied",
        reason: "Tài khoản không phải là owner.",
        metadata: {
          uid: user.uid,
          email: user.email,
          reason: "UID does not match owner UID"
        }
      });
      throw new AppError(
        "PERMISSION_DENIED",
        "Tài khoản không phải là owner.",
        req.requestId
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const checkPermission = (requiredPermission: Permission) => {
  return (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("AUTH_REQUIRED", "Yêu cầu xác thực tài khoản.", req.requestId);
      }

      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      if (!userPermissions.includes(requiredPermission)) {
        throw new AppError(
          "PERMISSION_DENIED",
          `Tài khoản không có đủ quyền hạn. Yêu cầu quyền: ${requiredPermission}`,
          req.requestId
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
