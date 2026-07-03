import { Response, NextFunction } from "express";
import { AppRequest } from "./authTypes";
import { Permission, ROLE_PERMISSIONS } from "../../shared/permissions/permissions";
import { AppError } from "../../shared/errors/appError";

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
