import { Router, Response } from "express";
import { requireModuleEnabled } from "../moduleStateService";
import { authenticateRequest } from "../../auth/authenticateRequest";
import { checkPermission } from "../../auth/authorization";
import { identityService } from "./services/identityService";
import { logger } from "../../infrastructure/logging/logger";
import { AppRequest } from "../../auth/authTypes";
import { UserRole } from "../../../shared/permissions/permissions";

export function registerIdentityRoutes(router: Router) {
  const identityRouter = Router();

  // Kiểm soát kích hoạt module và bảo vệ danh tính
  identityRouter.use(requireModuleEnabled("identity-management"));
  identityRouter.use(authenticateRequest);

  // 1. Lấy danh sách phòng ban tổ chức (Yêu cầu đăng nhập, mọi vai trò có thể xem)
  identityRouter.get("/departments", async (req: AppRequest, res: Response, next) => {
    try {
      logger.info(`[IdentityRoutes] Lấy danh sách phòng ban. ReqID: ${req.requestId}`);
      const depts = await identityService.getDepartments(req.requestId);
      res.json({
        success: true,
        data: depts,
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  });

  // 2. Thêm phòng ban mới (Chỉ dành cho Admin)
  identityRouter.post(
    "/departments",
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next) => {
      try {
        const { id, name, description } = req.body;
        if (!id || !name) {
          res.status(400).json({ success: false, message: "ID và Tên phòng ban là bắt buộc." });
          return;
        }

        logger.info(`[IdentityRoutes] Tạo phòng ban mới: ${id} - ${name}. Actor: ${req.user?.email}. ReqID: ${req.requestId}`);
        const newDept = await identityService.createDepartment({ id, name, description }, req.requestId);
        res.json({
          success: true,
          data: newDept,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // 3. Lấy danh sách người dùng và phân quyền (Chỉ Admin)
  identityRouter.get(
    "/users",
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next) => {
      try {
        logger.info(`[IdentityRoutes] Admin truy vấn danh sách người dùng. ReqID: ${req.requestId}`);
        const users = await identityService.getUsers(req.requestId);
        res.json({
          success: true,
          data: users,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // 4. Cập nhật phân quyền và phòng ban của người dùng (Chỉ Admin)
  identityRouter.put(
    "/users/:uid",
    checkPermission("modules.manage"),
    async (req: AppRequest, res: Response, next) => {
      try {
        const { uid } = req.params;
        const { role, departmentIds, displayName } = req.body;

        if (!role || !Array.isArray(departmentIds)) {
          res.status(400).json({ success: false, message: "Vai trò (role) và mảng phòng ban (departmentIds) là bắt buộc." });
          return;
        }

        const validRoles: UserRole[] = ["admin", "manager", "editor", "operator", "viewer"];
        if (!validRoles.includes(role)) {
          res.status(400).json({ success: false, message: `Vai trò không hợp lệ. Chỉ chấp nhận: ${validRoles.join(", ")}` });
          return;
        }

        logger.info(`[IdentityRoutes] Cập nhật phân quyền cho User ${uid}. Vai trò mới: ${role}. Actor: ${req.user?.email}. ReqID: ${req.requestId}`);
        const updatedUser = await identityService.updateUserRoleAndDepartments(
          uid,
          role,
          departmentIds,
          displayName,
          req.requestId
        );

        res.json({
          success: true,
          data: updatedUser,
          requestId: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Đăng ký toàn bộ các route phụ thuộc vào root router
  router.use("/modules/identity", identityRouter);
}

export default registerIdentityRoutes;
