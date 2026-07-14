import { Router, Response, NextFunction } from "express";
import { AppRequest } from "../../../auth/authTypes";
import { authenticateRequest } from "../../../auth/authenticateRequest";
import { checkPermission } from "../../../auth/authorization";
import { requireModuleEnabled } from "../../moduleStateService";
import { geminiAgentService } from "../services/geminiAgentService";
import { ToolExecutionContext } from "../../../agent/agentTypes";
import { AppError } from "../../../../shared/errors/appError";
import { ROLE_PERMISSIONS } from "../../../../shared/permissions/permissions";

export function registerGeminiAgentRoutes(router: Router) {
  // POST /api/modules/gemini-agent/chat
  router.post(
    "/modules/gemini-agent/chat",
    authenticateRequest,
    checkPermission("agent.use"),
    requireModuleEnabled("gemini-agent"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const { message, previousInteractionId } = req.body;
        if (!message || !message.trim()) {
          throw new AppError("VALIDATION_FAILED", "Nội dung yêu cầu không được để trống.");
        }

        // Thiết lập headers cho Server-Sent Events (SSE)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Lấy danh sách quyền thực tế của user từ payload hoặc DB
        const role = req.user?.role || "viewer";
        const permissions = ROLE_PERMISSIONS[role] || [];

        const context: ToolExecutionContext = {
          userId: req.user?.uid || "anonymous",
          userRole: role,
          requestId: req.requestId,
          permissions: [...permissions],
          departments: ["dept-a"] // Mặc định phòng ban được truy cập
        };

        await geminiAgentService.chatStream(
          {
            message,
            previousInteractionId,
            context
          },
          (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        );

        res.end();
      } catch (error) {
        if (res.headersSent) {
          res.write(
            `data: ${JSON.stringify({
              event_type: "error",
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`
          );
          res.end();
        } else {
          next(error);
        }
      }
    }
  );

  // POST /api/modules/gemini-agent/resume
  router.post(
    "/modules/gemini-agent/resume",
    authenticateRequest,
    checkPermission("agent.use"),
    requireModuleEnabled("gemini-agent"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const { previousInteractionId, toolCallId, toolName, approved, arguments: toolArgs } = req.body;

        if (!previousInteractionId || !toolCallId || !toolName) {
          throw new AppError("VALIDATION_FAILED", "Thiếu thông tin nhận diện bước duyệt thực thi.");
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const role = req.user?.role || "viewer";
        const permissions = ROLE_PERMISSIONS[role] || [];

        const context: ToolExecutionContext = {
          userId: req.user?.uid || "anonymous",
          userRole: role,
          requestId: req.requestId,
          permissions: [...permissions],
          departments: ["dept-a"]
        };

        await geminiAgentService.resumeWithToolResult(
          {
            previousInteractionId,
            toolCallId,
            toolName,
            approved: !!approved,
            arguments: toolArgs || {},
            context
          },
          (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        );

        res.end();
      } catch (error) {
        if (res.headersSent) {
          res.write(
            `data: ${JSON.stringify({
              event_type: "error",
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`
          );
          res.end();
        } else {
          next(error);
        }
      }
    }
  );
}
