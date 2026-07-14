import { Router, Response, NextFunction } from "express";
import { requireModuleEnabled } from "../../moduleStateService";
import { authenticateRequest } from "../../../auth/authenticateRequest";
import { notificationService } from "../services/notificationService";
import { AppRequest } from "../../../auth/authTypes";
import { AppError } from "../../../../shared/errors/appError";
import { z } from "zod";

export function registerNotificationRoutes(router: Router) {
  const notifRouter = Router();

  notifRouter.use(requireModuleEnabled("notifications"));
  notifRouter.use(authenticateRequest);

  // 1. Lấy danh sách thông báo của người dùng hiện tại
  notifRouter.get("/", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new AppError("AUTH_REQUIRED", "Không nhận diện được ID người dùng.", req.requestId);
      }

      const list = await notificationService.getNotificationsForUser(userId);
      res.json({
        success: true,
        data: list,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. Đánh dấu đã đọc thông báo
  notifRouter.post("/mark-read", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new AppError("AUTH_REQUIRED", "Không nhận diện được ID người dùng.", req.requestId);
      }

      const bodySchema = z.object({
        ids: z.array(z.string()).optional()
      });

      const parseResult = bodySchema.safeParse(req.body);
      const ids = parseResult.success ? parseResult.data.ids : undefined;

      await notificationService.markAsRead(userId, ids);

      res.json({
        success: true,
        message: "Đã đánh dấu đọc thông báo thành công.",
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 3. Kích hoạt quét cảnh báo công việc thủ công (để kiểm thử/đồng bộ tức thì)
  notifRouter.post("/trigger-scan", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.scanAndNotifyOverdueTasks(req.requestId || "");
      res.json({
        success: true,
        data: result,
        message: `Quét hoàn tất. Đã kích hoạt ${result.overdueCount} cảnh báo quá hạn và ${result.nearDueCount} cảnh báo sắp quá hạn mới.`,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 4. Lấy lịch sử email mô phỏng (Dành cho Quản trị viên kiểm tra)
  notifRouter.get("/emails", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== "admin") {
        throw new AppError("PERMISSION_DENIED", "Bạn không có quyền quản trị để xem lịch sử email.", req.requestId);
      }

      const emails = await notificationService.getSimulatedEmails();
      res.json({
        success: true,
        data: emails,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 5. Gửi thử một email mô phỏng trực tiếp
  notifRouter.post("/send-test-email", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        recipient: z.string().email(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000)
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError("VALIDATION_FAILED", "Email nhận hoặc nội dung không hợp lệ.", req.requestId, parseResult.error.format());
      }

      const log = await notificationService.sendSimulatedEmail({
        recipient: parseResult.data.recipient,
        subject: parseResult.data.subject,
        body: parseResult.data.body
      });

      res.json({
        success: true,
        data: log,
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  router.use("/notifications", notifRouter);
}

export default registerNotificationRoutes;
