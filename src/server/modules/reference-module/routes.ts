import { Router } from "express";
import { requireModuleEnabled } from "../moduleStateService";
import { authenticateRequest } from "../../auth/authenticateRequest";
import { logger } from "../../infrastructure/logging/logger";

export function registerReferenceRoutes(router: Router) {
  const referenceRouter = Router();

  // Gắn các middleware chốt chặn: Kiểm tra trạng thái mô-đun trước tiên
  referenceRouter.use(requireModuleEnabled("reference-module"));
  // Chốt bảo mật xác thực danh tính
  referenceRouter.use(authenticateRequest);

  referenceRouter.get("/info", (req: any, res) => {
    logger.info(`ReferenceModule: Lấy thông tin cấu trúc mẫu. ReqID: ${req.requestId}`);
    res.json({
      success: true,
      data: {
        message: "Chào mừng bạn đến với mô-đun tham chiếu chuẩn (QLCV_PQG Next)!",
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
  });

  router.use("/api/modules/reference", referenceRouter);
}
export default registerReferenceRoutes;
