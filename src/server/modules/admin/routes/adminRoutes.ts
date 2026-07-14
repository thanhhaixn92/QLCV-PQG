import { Router, Response, NextFunction } from "express";
import { requireModuleEnabled } from "../../moduleStateService";
import { authenticateRequest } from "../../../auth/authenticateRequest";
import { identityService } from "../../identity/services/identityService";
import { aiUsageTracker } from "../../gemini-agent/services/aiUsageTracker";
import { AppRequest } from "../../../auth/authTypes";
import { AppError } from "../../../../shared/errors/appError";
import { UserRole } from "../../../../shared/permissions/permissions";
import { z } from "zod";

export function registerAdminRoutes(router: Router) {
  const adminPanelRouter = Router();

  adminPanelRouter.use(requireModuleEnabled("admin-panel"));
  adminPanelRouter.use(authenticateRequest);

  // Chốt bảo mật: Chỉ cho phép tài khoản Admin thực hiện các tác vụ này
  adminPanelRouter.use((req: AppRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
      return next(new AppError("PERMISSION_DENIED", "Bạn không có quyền quản trị để truy cập tài nguyên này.", req.requestId));
    }
    next();
  });

  // 1. Lấy danh sách toàn bộ người dùng
  adminPanelRouter.get("/users", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const users = await identityService.getUsers(req.requestId);
      const departments = await identityService.getDepartments(req.requestId);

      res.json({
        success: true,
        data: {
          users,
          departments
        },
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. Cập nhật vai trò và phòng ban người dùng
  adminPanelRouter.put("/users/:uid/role", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const { uid } = req.params;
      const bodySchema = z.object({
        role: z.enum(["admin", "manager", "editor", "operator", "viewer"]),
        departmentIds: z.array(z.string()),
        displayName: z.string().optional()
      });

      const parseResult = bodySchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError("VALIDATION_FAILED", "Dữ liệu cập nhật vai trò không hợp lệ.", req.requestId, parseResult.error.format());
      }

      const { role, departmentIds, displayName } = parseResult.data;

      const updatedUser = await identityService.updateUserRoleAndDepartments(
        uid,
        role as UserRole,
        departmentIds,
        displayName,
        req.requestId
      );

      res.json({
        success: true,
        data: updatedUser,
        message: `Đã cập nhật phân quyền thành công cho người dùng ${updatedUser.displayName || uid}.`,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 3. Lấy chỉ số thống kê lưu lượng AI tiêu thụ (Gemini usage metrics)
  adminPanelRouter.get("/ai-usage", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const metrics = await aiUsageTracker.getMetrics();
      res.json({
        success: true,
        data: metrics,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  router.use("/admin-panel", adminPanelRouter);
}

export default registerAdminRoutes;
